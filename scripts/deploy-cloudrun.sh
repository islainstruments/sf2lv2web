#!/bin/bash

# Exit on error
set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"sf2lv2"}  # Change this to your GCP project ID
REGION=${REGION:-"us-central1"}     # Change this to your preferred region
SERVICE_NAME="sf2lv2-web"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
BUILDER_SERVICE_NAME="sf2lv2-builder"
BUILDER_IMAGE_NAME="gcr.io/${PROJECT_ID}/${BUILDER_SERVICE_NAME}"

# Build the web application image
echo "Building web application Docker image..."
docker build -t ${IMAGE_NAME} .

# Build the builder image
echo "Building builder Docker image..."
docker build -t ${BUILDER_IMAGE_NAME} -f docker/Dockerfile .

# Push the images to Google Container Registry
echo "Pushing images to Google Container Registry..."
docker push ${IMAGE_NAME}
docker push ${BUILDER_IMAGE_NAME}

# Deploy web service to Cloud Run
echo "Deploying web service to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 5m \
  --set-env-vars="NODE_ENV=production,PORT=8080"

# Get the URL of the deployed service
URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')
echo "Web service deployed at: ${URL}"

# Deploy builder service to Cloud Run
echo "Deploying builder service to Cloud Run..."
gcloud run deploy ${BUILDER_SERVICE_NAME} \
  --image ${BUILDER_IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --memory 2Gi \
  --cpu 2 \
  --no-allow-unauthenticated \
  --timeout 15m \
  --set-env-vars="CROSS_COMPILE=aarch64-linux-gnu-,CC=aarch64-linux-gnu-gcc,CXX=aarch64-linux-gnu-g++,AR=aarch64-linux-gnu-ar,LD=aarch64-linux-gnu-ld,STRIP=aarch64-linux-gnu-strip,BUILD_DIR=/build"

echo "Deployment complete!"
echo "Web service: ${URL}"
echo "Builder service is private and can be accessed only by the web service" 