import { Router } from 'express';
import multer from 'multer';
import { createJob, simulateConversion } from '../utils/api';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/x-soundfont' || file.originalname.endsWith('.sf2')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .sf2 files are allowed.'));
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
  },
});

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing file:', req.file.path);

    // Create a new conversion job with basic metadata
    const job = createJob({
      version: { major: 2, minor: 1 }, // Default SF2 version
      name: req.file.originalname,
      date: new Date().toISOString().split('T')[0],
      comment: '',
      tools: 'SF2LV2 Web',
      presets: [],
      instruments: [],
      samples: []
    });

    // Start simulated conversion process
    simulateConversion(job.id);

    res.json({
      jobId: job.id,
      metadata: job.metadata,
    });
  } catch (error) {
    console.error('Error processing upload:', error);
    res.status(500).json({ error: 'Failed to process SoundFont file' });
  }
});

export default router; 