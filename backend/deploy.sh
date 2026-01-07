#!/bin/bash

# Petivolution Backend Deployment Script
# This script builds and deploys the backend to Google Cloud Run

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration (update these values)
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="petivolution-backend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo -e "${GREEN}🚀 Petivolution Backend Deployment${NC}\n"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Error: gcloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if project ID is set
if [ "$PROJECT_ID" == "your-project-id" ]; then
    echo -e "${YELLOW}⚠️  Warning: PROJECT_ID not set${NC}"
    echo "Please set GCP_PROJECT_ID environment variable or update this script"
    echo "Example: export GCP_PROJECT_ID=my-project-id"
    exit 1
fi

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service: $SERVICE_NAME"
echo "  Image: $IMAGE_NAME"
echo ""

# Set the active project
echo -e "${YELLOW}🔧 Setting active project...${NC}"
gcloud config set project "$PROJECT_ID"

# Enable required APIs (only needed on first deployment)
echo -e "${YELLOW}🔌 Ensuring required APIs are enabled...${NC}"
gcloud services enable cloudbuild.googleapis.com --quiet
gcloud services enable run.googleapis.com --quiet
gcloud services enable containerregistry.googleapis.com --quiet

# Build the Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t "$IMAGE_NAME:latest" .

# Push the image to Google Container Registry
echo -e "${YELLOW}📤 Pushing image to GCR...${NC}"
docker push "$IMAGE_NAME:latest"

# Deploy to Cloud Run
echo -e "${YELLOW}🚢 Deploying to Cloud Run...${NC}"
gcloud run deploy "$SERVICE_NAME" \
  --image="$IMAGE_NAME:latest" \
  --region="$REGION" \
  --platform=managed \
  --max-instances=1 \
  --min-instances=0 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --port=3000 \
  --allow-unauthenticated \
  --set-env-vars=NODE_ENV=production

# Get the service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region="$REGION" \
  --format='value(status.url)')

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌍 Service URL: $SERVICE_URL${NC}"
echo ""
echo -e "${YELLOW}Test the deployment:${NC}"
echo "  Health check:  curl $SERVICE_URL/health"
echo "  World summary: curl $SERVICE_URL/api/world/summary"
echo "  Snapshot:      curl $SERVICE_URL/api/world/snapshot"
echo ""
echo -e "${YELLOW}View logs:${NC}"
echo "  gcloud run logs read --service=$SERVICE_NAME --region=$REGION"
echo ""
