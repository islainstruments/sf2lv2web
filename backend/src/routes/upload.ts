import { Router } from 'express';
import multer from 'multer';
import { createJob, simulateConversion } from '../utils/api';
import path from 'path';
import fs from 'fs';
import { triggerDockerBuild } from '../utils/docker';
import { buildQueue } from '../utils/queue';

const router = Router();

// Configure multer for memory storage with SF2 file validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
    fieldSize: 1024 * 1024 * 1024, // 1GB field size limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is a SoundFont file
    if (file.originalname.toLowerCase().endsWith('.sf2')) {
      cb(null, true);
    } else {
      cb(new Error('Only .sf2 files are allowed'));
    }
  }
}).single('file');

// Wrap multer in a promise to handle errors better
const handleUpload = (req: any, res: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    console.log('Starting upload handler');
    
    // Track request state
    let requestClosed = false;
    let uploadComplete = false;
    
    // Handle request close
    req.on('close', () => {
      requestClosed = true;
      console.log('Request closed. Upload complete:', uploadComplete);
      if (!uploadComplete) {
        reject(new Error('Request closed before upload completed'));
      }
    });

    // Handle request errors
    req.on('error', (error: Error) => {
      console.error('Request error:', error);
      reject(error);
    });

    // Handle response errors
    res.on('error', (error: Error) => {
      console.error('Response error:', error);
      reject(error);
    });

    // Track data chunks
    let totalBytesReceived = 0;
    req.on('data', (chunk: Buffer) => {
      totalBytesReceived += chunk.length;
      console.log(`Received chunk: ${chunk.length} bytes. Total received: ${totalBytesReceived} bytes`);
    });

    // Process the upload
    upload(req, res, (err: any) => {
      if (requestClosed) {
        console.log('Upload callback called after request closed');
        return;
      }

      if (err) {
        console.error('Upload error:', err);
        if (err instanceof multer.MulterError) {
          console.error('Multer error details:', {
            code: err.code,
            field: err.field,
            message: err.message
          });
        }
        reject(err);
        return;
      }

      if (!req.file) {
        console.log('No file received');
        reject(new Error('No file received'));
        return;
      }

      console.log('Upload successful:', {
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        encoding: req.file.encoding
      });

      uploadComplete = true;
      resolve(req.file);
    });
  });
};

router.post('/', async (req, res) => {
  console.log('Upload route: Starting request handling');
  console.log('Upload route: Content-Length:', req.headers['content-length']);
  console.log('Upload route: Content-Type:', req.headers['content-type']);
  
  try {
    const file = await handleUpload(req, res);
    
    // Generate a clean plugin name from the original filename
    const cleanFileName = file.originalname
      .toLowerCase()
      .replace(/\.sf2$/i, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
    
    // Create job-specific directories
    const jobId = buildQueue.generateJobId();
    const jobDir = path.join(process.cwd(), 'temp', jobId);
    const jobInputDir = path.join(jobDir, 'input');
    const jobPluginsDir = path.join(jobDir, 'plugins');
    
    // Ensure directories exist
    [jobDir, jobInputDir, jobPluginsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    // Save the file with a clean name
    const savedFileName = `soundfont.sf2`;
    const filepath = path.join(jobInputDir, savedFileName);
    fs.writeFileSync(filepath, file.buffer);
    
    console.log('File saved to:', filepath);

    // Add job to queue but don't start processing yet
    const job = buildQueue.addJob(filepath, cleanFileName, jobId, false);

    console.log('Upload route: Created job:', {
      id: job.id,
      status: job.status,
      pluginName: job.pluginName
    });

    res.json({
      success: true,
      file: {
        name: file.originalname,
        size: file.size,
        path: filepath,
        pluginName: cleanFileName
      },
      job: {
        id: job.id,
        status: job.status
      }
    });
  } catch (error) {
    console.error('Upload route: Error during processing:', error);
    res.status(500).json({ 
      error: 'Failed to process file upload',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Add status endpoint
router.get('/status/:jobId', (req, res) => {
  const job = buildQueue.getJob(req.params.jobId);
  if (!job) {
    console.log('Status route: Job not found:', req.params.jobId);
    res.status(404).json({ error: 'Job not found' });
    return;
  }
  console.log('Status route: Returning job status:', {
    id: job.id,
    status: job.status,
    pluginName: job.pluginName
  });
  res.json(job);
});

export default router; 