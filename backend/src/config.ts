export const config = {
  port: process.env.PORT || 4001,
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://sf2lv2.islainstruments.com']  // Replace with your domain
      : ['http://localhost:3000', 'http://localhost:5173', '*'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: true,
    maxAge: 600
  },
  uploadLimits: {
    fileSize: 1024 * 1024 * 1024, // 1GB
    fieldSize: 1024 * 1024 * 1024  // 1GB
  },
  tempDir: process.env.TEMP_DIR || 'temp',
  cleanupInterval: 60 * 60 * 1000, // 1 hour
  jobTimeout: 30 * 60 * 1000 // 30 minutes
}; 
