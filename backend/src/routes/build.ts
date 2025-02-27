import express from 'express';
import { buildQueue } from '../utils/queue';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log('Build route: Received request with body:', req.body);
  
  const { jobId } = req.body;
  
  if (!jobId) {
    console.log('Build route: No jobId provided');
    return res.status(400).json({ error: 'Job ID is required' });
  }

  const job = buildQueue.getJob(jobId);
  if (!job) {
    console.log('Build route: Job not found for ID:', jobId);
    return res.status(404).json({ error: 'Job not found' });
  }

  console.log('Build route: Found job:', {
    id: job.id,
    status: job.status,
    pluginName: job.pluginName,
    soundfontPath: job.soundfontPath
  });

  if (job.status !== 'ready') {
    console.log('Build route: Job in wrong state:', job.status);
    return res.status(400).json({ 
      error: 'Job cannot be started',
      details: `Job is in ${job.status} state`
    });
  }

  try {
    console.log('Build route: Starting job processing');
    // Start processing the job
    await buildQueue.processJob(jobId);
    console.log('Build route: Job processing completed successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Build route: Error processing job:', error);
    res.status(500).json({ 
      error: 'Failed to process job',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router; 