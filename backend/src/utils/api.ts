import { Job as ConversionJob, SoundFontMetadata } from '../types';

// In-memory store for conversion jobs
const jobs = new Map<string, ConversionJob>();

export function createJob(metadata: SoundFontMetadata): ConversionJob {
  const jobId = Date.now().toString();
  const job: ConversionJob = {
    id: jobId,
    status: 'validating',
    progress: 0,
    metadata,
    soundfontPath: metadata.name,
    pluginName: metadata.name.replace(/\.sf2$/, ''),
    created: new Date(),
    updated: new Date()
  };
  jobs.set(jobId, job);
  return job;
}

export function getJob(jobId: string): ConversionJob | undefined {
  return jobs.get(jobId);
}

export function updateJob(jobId: string, updates: Partial<ConversionJob>): ConversionJob | undefined {
  const job = jobs.get(jobId);
  if (!job) return undefined;

  const updatedJob = { ...job, ...updates };
  jobs.set(jobId, updatedJob);
  return updatedJob;
}

export function simulateConversion(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) return;

  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    
    const updates: Partial<ConversionJob> = {
      progress,
    };

    if (progress < 33) {
      updates.status = 'building';
    } else if (progress < 66) {
      updates.status = 'packaging';
    } else if (progress === 100) {
      updates.status = 'complete';
      updates.outputPath = `/download/${jobId}/plugin.lv2`;
      clearInterval(interval);
    }

    updateJob(jobId, updates);
  }, 1000);
} 