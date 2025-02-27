# Backend-Only API Deployment to Render.com

If you're having issues with the frontend build, you can deploy just the backend API to Render.com as a fallback solution. This guide explains how to do that.

## Step 1: Build and Prepare the Backend

```bash
# From the project root
cd backend
npm ci
npm run build
```

## Step 2: Create a Distribution Package

```bash
# Create a temporary directory for the deployment package
mkdir -p ../deploy-backend
cp -r dist package.json package-lock.json ../deploy-backend/
mkdir -p ../deploy-backend/plugins/uploads ../deploy-backend/plugins/temp
# Create a simple index.html for the health check
echo '<!DOCTYPE html><html><body><h1>SF2LV2 API</h1><p>API is running. Use /api endpoints.</p></body></html>' > ../deploy-backend/index.html
# Create a simple start script
echo 'cd /app && npm ci --production && node dist/index.js' > ../deploy-backend/start.sh
chmod +x ../deploy-backend/start.sh
# Package it up
cd ../deploy-backend
zip -r ../sf2lv2-api.zip .
cd ..
```

## Step 3: Deploy to Render

1. **Create a Render account** at https://render.com/

2. **Create a new Web Service**:
   - In the Render dashboard, click "New +" and select "Web Service"
   - Choose "Deploy from existing image" or "Upload"
   - Upload the `sf2lv2-api.zip` file you created

3. **Configure the Service**:
   - Name: `sf2lv2-api`
   - Environment: `Node`
   - Build Command: `npm ci --production`
   - Start Command: `node dist/index.js`
   - Add these environment variables:
     - `NODE_ENV`: `production`
     - `PORT`: `10000`

4. **Deploy the Service**

## Step 4: Access Your API

Once deployed, your API will be available at:
`https://sf2lv2-api.onrender.com/api/`

You can test it with:
`https://sf2lv2-api.onrender.com/api/health`

## Frontend Development

With the API deployed, you can now develop your frontend locally and point it to the Render API:

1. Update your frontend API base URL to point to the Render deployment
2. Complete the frontend development locally
3. Deploy the frontend separately when ready

## CORS Configuration

You may need to update the CORS configuration in your backend to allow requests from your frontend domain. Add your frontend domain to the CORS origin list in `backend/src/index.ts`. 