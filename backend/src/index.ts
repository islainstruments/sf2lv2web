import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload';
import statusRouter from './routes/status';
import buildRouter from './routes/build';
import downloadRouter from './routes/download';

const app = express();
const PORT = process.env.PORT || 4001;

// Increase payload size limit and timeouts
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));
app.use(express.raw({ limit: '1gb' }));

// Enable CORS with specific configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://sf2lv2.islainstruments.com'], // Allow both Vite and CRA default ports
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: true,
  maxAge: 600 // Increase preflight cache time
}));

// Add request logging middleware
app.use((req, res, next) => {
  // Disable request timeout
  req.setTimeout(0);
  
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} - Started`);
  res.on('finish', () => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url} - Finished ${res.statusCode}`);
  });
  res.on('close', () => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url} - Connection closed`);
  });
  res.on('error', (error) => {
    console.error(`${new Date().toISOString()} ${req.method} ${req.url} - Error:`, error);
  });
  next();
});

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/status', statusRouter);
app.use('/api/build', buildRouter);
app.use('/api/download', downloadRouter);

// Serve static files from uploads directory
app.use('/download', express.static('uploads'));

// Health check endpoint
app.get('/api/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

// Create server with custom settings
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Configure server timeouts
server.keepAliveTimeout = 120000; // 2 minutes
server.headersTimeout = 120000; // 2 minutes
server.timeout = 0; // Disable timeout

// Handle server errors
server.on('error', (error: any) => {
  console.error('Server error:', error);
});

export default app; 
server.keepAliveTimeout = 10 * 60 * 1000; // 10 minutes 
