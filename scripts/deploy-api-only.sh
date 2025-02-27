#!/bin/bash
set -e

echo "===== Preparing SF2LV2 API for Render Deployment ====="

# Ensure script is run from project root
if [ ! -d "backend" ]; then
  echo "Error: Please run this script from the project root directory."
  exit 1
fi

# Create deployment directory
echo "Creating deployment directory..."
mkdir -p deploy-backend

# Build backend
echo "Building backend..."
cd backend
npm ci
npm run build
cd ..

# Copy necessary files
echo "Copying files to deployment directory..."
cp -r backend/dist backend/package.json backend/package-lock.json deploy-backend/

# Create required directories
echo "Creating required directories..."
mkdir -p deploy-backend/plugins/uploads deploy-backend/plugins/temp

# Create a simple index.html for the API root
echo "Creating index.html..."
cat > deploy-backend/index.html << EOL
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SF2LV2 API</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>SF2LV2 API</h1>
  <p>The API is running successfully. Use the following endpoints:</p>
  <ul>
    <li><code>/api/health</code> - Health check endpoint</li>
    <li><code>/api/upload</code> - Upload SoundFont files</li>
    <li><code>/api/status</code> - Check conversion status</li>
    <li><code>/api/build</code> - Build LV2 plugins</li>
    <li><code>/api/download</code> - Download converted plugins</li>
  </ul>
</body>
</html>
EOL

# Update Node.js version file
echo "Setting Node.js version..."
echo "18.x" > deploy-backend/.node-version

# Create zip file
echo "Creating deployment package..."
cd deploy-backend
zip -r ../sf2lv2-api.zip .
cd ..

echo "===== Deployment Preparation Complete! ====="
echo "Your API deployment package is available at:"
echo "$(pwd)/sf2lv2-api.zip"
echo ""
echo "Upload this file to Render.com as a Web Service."
echo "Configure with:"
echo "  - Build Command: npm ci --production"
echo "  - Start Command: node dist/index.js"
echo "  - Environment Variables:"
echo "    - NODE_ENV: production"
echo "    - PORT: 10000" 