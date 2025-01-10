import { Router } from 'express';
import { getJob } from '../utils/api';

const router = Router();

router.get('/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json(job);
});

export default router; 