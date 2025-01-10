import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload';
import statusRouter from './routes/status';

const app = express();
const port = process.env.PORT || 4000;

// Increase payload size limit to 1GB
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb', extended: true }));

// Enable CORS
app.use(cors());

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/status', statusRouter);

// Serve static files from uploads directory
app.use('/download', express.static('uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 