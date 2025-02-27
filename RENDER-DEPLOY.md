# Deploying SF2LV2-Web to Render.com

This guide explains how to deploy the SF2LV2-Web application to Render.com.

## Option 1: Automatic Deployment from Git (Recommended)

1. **Create a Render account** at https://render.com/

2. **Connect your GitHub/GitLab repository**:
   - In the Render dashboard, click "New +" and select "Blueprint"
   - Connect your GitHub/GitLab account and select the repository
   - Render will automatically detect the `render.yaml` file and configure the deployment

3. **Wait for the build and deployment** to complete

4. **Visit your app** at the URL provided by Render

## Option 2: Manual Deployment (Without Git)

1. **Build the application locally**:
   ```bash
   # From the project root
   ./scripts/build-for-render.sh
   ```

2. **Create a new Web Service on Render**:
   - In the Render dashboard, click "New +" and select "Web Service"
   - Choose "Deploy from existing image" or "Upload"
   - For "Upload", compress the `backend` directory after running the build script:
     ```bash
     cd backend
     zip -r ../sf2lv2-web-backend.zip .
     ```
   
3. **Configure the Service**:
   - Name: `sf2lv2-web`
   - Environment: `Node`
   - Build Command: `npm ci --production`
   - Start Command: `node dist/index.js`
   - Add the environment variables from `render.yaml`

4. **Deploy the Service**

## Environment Variables

Ensure these environment variables are set in your Render dashboard:

- `NODE_ENV`: `production`
- `PORT`: `10000` (Render uses this port by default)

## Troubleshooting

- **Worklet Not Loading**: Check the browser console. The worklet file should be served from `/worklet_processor.min.js`
- **Build Errors**: Check the build logs in the Render dashboard
- **API Errors**: Check the server logs in the Render dashboard

## Local Testing

Test the deployment locally with Docker:

```bash
docker build -t sf2lv2-web:local .
docker run -p 8080:8080 sf2lv2-web:local
```

Visit http://localhost:8080 to access the application. 