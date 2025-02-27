# SF2LV2 Web Application Deployment Guide for Render.com

This guide provides step-by-step instructions for deploying the SF2LV2 Web Application to Render.com.

## Option 1: Deploy via GitHub (Recommended)

### 1. Push your code to GitHub
```bash
# Initialize Git repository if needed
git init
git add .
git commit -m "Prepare for Render deployment"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Create a Render Account
- Sign up or log in at [render.com](https://render.com/)

### 3. Create a New Blueprint
- In the Render dashboard, click "New +" and select "Blueprint"
- Connect your GitHub account
- Select the repository with your SF2LV2 code
- Render will automatically detect the `render.yaml` file

### 4. Deploy
- Click "Apply Blueprint"
- Render will automatically build and deploy your service

## Option 2: Manual Deploy (Without GitHub)

### 1. Build the Application
```bash
# Run the build script
./scripts/build-for-render.sh
```

### 2. Create a ZIP File
```bash
cd backend
zip -r ../sf2lv2-web.zip .
cd ..
```

### 3. Create a Web Service on Render
- Log in to [render.com](https://render.com/)
- Click "New +" and select "Web Service"
- Select "Deploy an existing image"

### 4. Upload Your Build
- In the Render interface, select "Upload"
- Upload the `sf2lv2-web.zip` file

### 5. Configure the Service
- Name: `sf2lv2-web`
- Environment: `Node.js`
- Build Command: `npm ci --production`
- Start Command: `node dist/index.js`
- Environment Variables:
  - `NODE_ENV`: `production`
  - `PORT`: `10000`

### 6. Deploy
- Click "Create Web Service"

## Verify Your Deployment

After deployment, your application will be available at:
`https://YOUR_SERVICE_NAME.onrender.com`

To test that everything is working:
- Visit the main page to see the frontend
- Test the API with `/api/health`

## Troubleshooting

- **Worklet Not Loading**: Check the browser console. The worklet file path should be `/worklet_processor.min.js`
- **CORS Issues**: Update the CORS configuration in `backend/src/index.ts` to include your frontend domain
- **Build Errors**: Check the build logs in the Render dashboard 