# Deployment Guide for Petivolution Backend

This guide explains how to deploy the Petivolution backend to Google Cloud Run.

## Prerequisites

1. **Google Cloud Project**: You need a GCP project with billing enabled
2. **gcloud CLI**: Install from [https://cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
3. **Docker**: Install from [https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/)
4. **Authentication**: Run `gcloud auth login` to authenticate

## First-Time Setup

### 1. Configure gcloud CLI

```bash
# Login to Google Cloud
gcloud auth login

# Set your project ID
export GCP_PROJECT_ID="your-project-id"
gcloud config set project $GCP_PROJECT_ID

# Set your preferred region
export GCP_REGION="us-central1"
gcloud config set run/region $GCP_REGION
```

### 2. Enable Required APIs

```bash
# Enable Cloud Run, Cloud Build, and Container Registry
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 3. Configure Docker for GCR

```bash
# Configure Docker to use gcloud as credential helper
gcloud auth configure-docker
```

## Deployment Methods

### Method 1: Using the Deploy Script (Recommended)

The easiest way to deploy is using the provided deployment script:

```bash
cd backend

# Make the script executable
chmod +x deploy.sh

# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"  # Optional, defaults to us-central1

# Deploy
./deploy.sh
```

The script will:
- Build the Docker image
- Push it to Google Container Registry
- Deploy to Cloud Run with the correct configuration
- Display the service URL

### Method 2: Using Cloud Build (CI/CD)

For automated deployments from a Git repository:

```bash
# From the project root
gcloud builds submit --config=backend/cloudbuild.yaml \
  --substitutions=_REGION=us-central1
```

To set up automatic deployments on Git push, configure a Cloud Build trigger in the GCP Console.

### Method 3: Manual Deployment

If you want more control:

```bash
cd backend

# Build the Docker image
docker build -t gcr.io/$GCP_PROJECT_ID/petivolution-backend:latest .

# Push to GCR
docker push gcr.io/$GCP_PROJECT_ID/petivolution-backend:latest

# Deploy to Cloud Run
gcloud run deploy petivolution-backend \
  --image=gcr.io/$GCP_PROJECT_ID/petivolution-backend:latest \
  --region=$GCP_REGION \
  --platform=managed \
  --max-instances=1 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=300 \
  --port=3000 \
  --allow-unauthenticated
```

## Configuration Options

### Single Instance (Critical!)

The backend is configured with `--max-instances=1` to prevent multiple instances from running the world simulation simultaneously. This prevents "world forking" where different instances have different world states.

**⚠️ DO NOT increase max-instances unless you implement proper state synchronization!**

### Memory and CPU

Default configuration:
- Memory: 512Mi
- CPU: 1 vCPU

Adjust based on your needs:

```bash
# For larger worlds or more entities
gcloud run services update petivolution-backend \
  --memory=1Gi \
  --cpu=2 \
  --region=$GCP_REGION
```

### Request Timeout

Default: 300 seconds (5 minutes)
Maximum: 3600 seconds (60 minutes)

```bash
# Increase timeout for long-running requests
gcloud run services update petivolution-backend \
  --timeout=3600 \
  --region=$GCP_REGION
```

### Minimum Instances

Default: 0 (scales to zero when not in use)

To keep the service always running (avoid cold starts):

```bash
gcloud run services update petivolution-backend \
  --min-instances=1 \
  --region=$GCP_REGION
```

**Note**: This will incur charges even when the service is idle.

## Environment Variables

To add environment variables to the deployment:

```bash
gcloud run services update petivolution-backend \
  --set-env-vars="NODE_ENV=production,TICK_RATE=30" \
  --region=$GCP_REGION
```

For secrets (API keys, credentials), use Secret Manager:

```bash
# Create a secret
echo -n "your-secret-value" | gcloud secrets create my-secret --data-file=-

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding my-secret \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Mount the secret
gcloud run services update petivolution-backend \
  --set-secrets="MY_SECRET=my-secret:latest" \
  --region=$GCP_REGION
```

## Testing the Deployment

After deployment, you'll get a service URL like: `https://petivolution-backend-XXXXX-uc.a.run.app`

Test the endpoints:

```bash
# Store the URL
export SERVICE_URL="https://your-service-url.run.app"

# Health check
curl $SERVICE_URL/health

# World summary
curl $SERVICE_URL/api/world/summary

# World snapshot
curl $SERVICE_URL/api/world/snapshot

# Spawn an entity
curl -X POST $SERVICE_URL/api/actions/spawn \
  -H "Content-Type: application/json" \
  -d '{"species":"rat","x":100,"y":100}'

# Place an object
curl -X POST $SERVICE_URL/api/actions/place-object \
  -H "Content-Type: application/json" \
  -d '{"type":"water","x":200,"y":200}'
```

## Viewing Logs

### Stream logs in real-time

```bash
gcloud run logs tail petivolution-backend --region=$GCP_REGION
```

### View recent logs

```bash
gcloud run logs read petivolution-backend --region=$GCP_REGION --limit=50
```

### View in Cloud Console

Navigate to: Cloud Run → petivolution-backend → Logs

## Monitoring

### View metrics in Cloud Console

Navigate to: Cloud Run → petivolution-backend → Metrics

Key metrics to monitor:
- Request count
- Request latency
- Container instance count (should be 1!)
- Container CPU utilization
- Container memory utilization

### Set up alerts

```bash
# Example: Alert if instance count > 1
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Multiple Instances Alert" \
  --condition-display-name="Instance count > 1" \
  --condition-threshold-value=1 \
  --condition-threshold-duration=60s
```

## Troubleshooting

### Build Fails

1. Check Docker is running: `docker ps`
2. Verify TypeScript compiles locally: `npm run build`
3. Check build logs: `gcloud builds list --limit=5`

### Deployment Fails

1. Check service account permissions
2. Verify APIs are enabled
3. Check region is correct
4. Review error in `gcloud` output

### Service Returns 500 Errors

1. Check logs: `gcloud run logs tail petivolution-backend`
2. Look for runtime errors or crashes
3. Verify environment variables are set correctly

### Cold Starts

Cloud Run scales to zero by default. First request after idle period will be slow.

Solutions:
- Set `--min-instances=1` to keep one instance always running
- Implement warmup requests
- Optimize container startup time

### World State Lost on Redeploy

The current implementation is stateless - world state resets on each deployment.

Solutions for persistence:
- Implement save/load to Cloud Storage
- Use Cloud Firestore for state persistence
- Schedule periodic snapshots

## Cost Optimization

Default configuration with `min-instances=0`:
- No charges when idle
- Pay only for request processing time
- Free tier includes 2 million requests/month

With `min-instances=1`:
- Always-on pricing applies
- ~$15-30/month for 512Mi/1CPU
- No cold starts

## Updating the Deployment

After making code changes:

```bash
cd backend
./deploy.sh
```

Cloud Run will:
1. Build and deploy the new revision
2. Gradually shift traffic to the new revision
3. Keep the old revision available for rollback

### Rollback to Previous Revision

```bash
# List revisions
gcloud run revisions list --service=petivolution-backend --region=$GCP_REGION

# Rollback to a specific revision
gcloud run services update-traffic petivolution-backend \
  --to-revisions=REVISION_NAME=100 \
  --region=$GCP_REGION
```

## Security Best Practices

1. **Require Authentication**: Remove `--allow-unauthenticated` and use IAM or API keys
2. **Use Secret Manager**: Never commit secrets to Git
3. **Enable VPC**: For private resources, use VPC connector
4. **Rate Limiting**: Implement rate limiting in Express
5. **CORS**: Configure proper CORS settings for production

## Next Steps

- Set up continuous deployment with Cloud Build triggers
- Implement health checks and readiness probes
- Add monitoring and alerting
- Implement state persistence
- Set up staging and production environments
- Configure custom domain
