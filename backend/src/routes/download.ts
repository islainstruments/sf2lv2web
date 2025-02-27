import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { buildQueue } from '../utils/queue';
import archiver from 'archiver';

const router = Router();

router.get('/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  // Get job details
  const job = buildQueue.getJob(jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  if (job.status !== 'complete') {
    res.status(400).json({ error: 'Plugin not ready for download' });
    return;
  }

  // Get the plugin directory
  const jobDir = path.join(process.cwd(), 'temp', jobId);
  const pluginsDir = path.join(jobDir, 'plugins');
  
  // Path to the extracted plugin directory (not the entire plugins directory)
  const pluginDir = path.join(pluginsDir, job.pluginName, `${job.pluginName}.lv2`);
  
  // Check if plugin exists
  if (!fs.existsSync(pluginDir)) {
    console.error(`Plugin directory not found: ${pluginDir}`);
    res.status(404).json({ error: 'Plugin files not found' });
    return;
  }

  // Create a zip file of the plugin
  const zipFileName = `${job.pluginName}.zip`;
  const zipFilePath = path.join(jobDir, zipFileName);

  try {
    // Create zip archive
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      // Send the zip file
      res.download(zipFilePath, zipFileName, (err) => {
        if (err) {
          console.error('Error sending file:', err);
        }
        // Clean up zip file after sending
        fs.unlink(zipFilePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error cleaning up zip file:', unlinkErr);
          }
        });
      });
    });

    archive.on('error', (err: Error) => {
      throw err;
    });

    archive.pipe(output);
    
    // Add the .lv2 directory to the root of the zip
    // This ensures we're only zipping the actual plugin files and not any extra files
    archive.directory(pluginDir, `${job.pluginName}.lv2`);
    
    archive.finalize();
  } catch (error) {
    console.error('Error creating zip file:', error);
    res.status(500).json({ 
      error: 'Failed to create plugin download',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 