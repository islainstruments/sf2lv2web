import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

interface BuildOptions {
  soundfontPath: string;
  pluginName: string;
  jobId: string;
}

export async function triggerDockerBuild({ soundfontPath, pluginName, jobId }: BuildOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create job-specific paths with normalized paths to avoid double/triple slashes
    const jobDir = path.normalize(path.join(process.cwd(), 'temp', jobId));
    const jobPluginsDir = path.normalize(path.join(jobDir, 'plugins'));
    const jobInputDir = path.normalize(path.join(jobDir, 'input'));

    console.log('Docker build paths:', {
      soundfontPath,
      jobDir,
      jobPluginsDir,
      jobInputDir
    });

    // List input directory contents and get the actual filename
    const inputFiles = fs.readdirSync(jobInputDir);
    console.log('Input directory contents:', inputFiles);
    
    if (inputFiles.length === 0) {
      reject(new Error('No input file found'));
      return;
    }
    const actualFileName = inputFiles[0]; // Use the first file found
    console.log('Using input file:', actualFileName);

    // Always use the same soundfont filename for consistency
    const correctFileName = 'soundfont.sf2';
    const sourceFile = path.normalize(path.join(jobInputDir, actualFileName));
    const targetFile = path.normalize(path.join(jobInputDir, correctFileName));
    
    try {
      // Copy the file with the new name
      fs.copyFileSync(sourceFile, targetFile);
      console.log('Copied soundfont file with correct name:', correctFileName);
    } catch (error) {
      reject(new Error(`Failed to copy soundfont file: ${error}`));
      return;
    }

    // Ensure job directories exist with clean normalized paths
    [jobDir, jobPluginsDir, jobInputDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Verify the file exists
    const fullInputPath = path.normalize(path.join(jobInputDir, correctFileName));
    if (!fs.existsSync(fullInputPath)) {
      reject(new Error(`Input file not found: ${fullInputPath}`));
      return;
    }
    console.log('Verified input file exists:', fullInputPath);
    
    // Create the Docker command with job-specific container name and volumes
    // Use absolute paths with normalization to prevent path issues
    const dockerCommand = 'docker';
    const args = [
      'run',
      '--rm',
      '-e', 'TERM=xterm-256color',
      '-e', 'CROSS_COMPILE=aarch64-linux-gnu-',
      '-e', 'CC=aarch64-linux-gnu-gcc',
      '-e', 'CXX=aarch64-linux-gnu-g++',
      '-e', 'AR=aarch64-linux-gnu-ar',
      '-e', 'LD=aarch64-linux-gnu-ld',
      '-e', 'STRIP=aarch64-linux-gnu-strip',
      // Add debug flag to show detailed output during build
      '-e', 'DEBUG=1',
      '--name', `sf2lv2-builder-${jobId}`,
      '-v', `${jobInputDir}:/input`,
      '-v', `${jobPluginsDir}:/output`,
      'sf2lv2-builder',
      '/build/build.sh',
      correctFileName,  // Always use the consistent name
      pluginName
    ];

    console.log('Docker command:', dockerCommand);
    console.log('Docker args:', JSON.stringify(args, null, 2));
    console.log('Full Docker command:', `${dockerCommand} ${args.join(' ')}`);

    const dockerProcess = spawn(dockerCommand, args);
    let output = '';
    let errorOutput = '';

    dockerProcess.stdout.on('data', (data) => {
      const text = data.toString();
      console.log('Docker stdout:', text);
      output += text;
    });

    dockerProcess.stderr.on('data', (data) => {
      const text = data.toString();
      console.error('Docker stderr:', text);
      errorOutput += text;
    });

    dockerProcess.on('close', async (code) => {
      console.log('Docker process closed with code:', code);
      if (code === 0) {
        // Check if the output file exists
        const expectedZipPath = path.normalize(path.join(jobPluginsDir, `${pluginName}.zip`));
        console.log('Checking for output file:', expectedZipPath);
        if (fs.existsSync(expectedZipPath)) {
          console.log('Build successful, output file found');
          
          // Extract the zip file to a clean normalized path
          const extractDir = path.normalize(path.join(jobPluginsDir, pluginName));
          if (!fs.existsSync(extractDir)) {
            fs.mkdirSync(extractDir, { recursive: true });
          }
          
          try {
            // Extract the zip file
            await execAsync(`unzip -o "${expectedZipPath}" -d "${extractDir}"`);
            
            // Verify the soundfont.sf2 file exists in the extracted plugin
            const pluginDir = path.normalize(path.join(extractDir, `${pluginName}.lv2`));
            const soundfontPath = path.normalize(path.join(pluginDir, 'soundfont.sf2'));
            
            if (!fs.existsSync(soundfontPath)) {
              throw new Error('soundfont.sf2 not found in extracted plugin');
            }
            
            resolve(output);
          } catch (error: any) {
            console.error('Error extracting or verifying plugin:', error);
            reject(new Error(`Failed to extract or verify plugin: ${error.message}`));
          }
        } else {
          console.error('Build completed but output file not found');
          reject(new Error('Build completed but plugin zip file not found'));
        }
      } else {
        console.error('Docker build failed:', {
          code,
          output,
          errorOutput
        });
        reject(new Error(`Docker build failed with code ${code}: ${errorOutput}`));
      }
    });

    dockerProcess.on('error', (error) => {
      console.error('Docker process error:', error);
      reject(new Error(`Docker process error: ${error.message}`));
    });
  });
} 