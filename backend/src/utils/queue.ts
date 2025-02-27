import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { triggerDockerBuild } from './docker';

export type JobStatus = 
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'validating'
  | 'building'
  | 'packaging'
  | 'ready'
  | 'complete'
  | 'failed'
  | 'error';

export interface Job {
  id: string;
  soundfontPath: string;
  pluginName: string;
  status: JobStatus;
  error?: string;
  output?: string;
  created: Date;
  updated: Date;
}

export class BuildQueue {
  private jobs: Map<string, Job>;
  private processing: boolean;

  constructor() {
    this.jobs = new Map();
    this.processing = false;
    
    // Ensure temp directory exists
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  }

  generateJobId(): string {
    return uuidv4();
  }

  addJob(soundfontPath: string, pluginName: string, jobId: string, startProcessing: boolean = false): Job {
    const job: Job = {
      id: jobId,
      soundfontPath,
      pluginName,
      status: 'ready',
      created: new Date(),
      updated: new Date()
    };
    
    this.jobs.set(jobId, job);
    
    if (startProcessing) {
      this.processJob(jobId);
    }
    
    return job;
  }

  async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'ready') {
      return;
    }

    job.status = 'building';
    job.updated = new Date();
    
    try {
      // Get the actual filename from the input directory
      const jobInputDir = path.join(process.cwd(), 'temp', jobId, 'input');
      const files = fs.readdirSync(jobInputDir);
      if (files.length === 0) {
        throw new Error('No input file found');
      }
      const actualSoundFontPath = path.join(jobInputDir, files[0]); // Use the first file found
      
      const output = await triggerDockerBuild({
        soundfontPath: actualSoundFontPath,
        pluginName: job.pluginName,
        jobId: job.id
      });
      
      job.status = 'complete';
      job.output = output;
      job.updated = new Date();
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.updated = new Date();
      throw error; // Re-throw to propagate to the build route
    }
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  updateJob(jobId: string, updates: Partial<Job>): Job | undefined {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, { ...updates, updated: new Date() });
      this.jobs.set(jobId, job);
      return job;
    }
    return undefined;
  }

  cleanup() {
    const tempDir = path.join(process.cwd(), 'temp');
    if (fs.existsSync(tempDir)) {
      const contents = fs.readdirSync(tempDir);
      const now = Date.now();
      
      contents.forEach(item => {
        const itemPath = path.join(tempDir, item);
        const stats = fs.statSync(itemPath);
        
        // Remove items older than 1 hour
        if (now - stats.mtimeMs > 3600000) {
          if (stats.isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(itemPath);
          }
        }
      });
    }
  }
}

// Export singleton instance
export const buildQueue = new BuildQueue();

// Run cleanup every hour
setInterval(() => buildQueue.cleanup(), 60 * 60 * 1000); 