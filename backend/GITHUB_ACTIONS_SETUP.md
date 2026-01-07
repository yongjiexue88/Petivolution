# GitHub Actions CI/CD Setup Guide

This guide explains how to set up automated deployment to Cloud Run using GitHub Actions.

## Overview

The GitHub Actions workflow automatically deploys your backend to Cloud Run whenever you push to the `main` branch. The workflow:
- Triggers on pushes to `main` that affect the `backend/` directory
- Builds a Docker image
- Pushes to Google Container Registry
- Deploys to Cloud Run
- Verifies the deployment with health checks

## Prerequisites

- GitHub repository for Petivolution
- Google Cloud Project with billing enabled
- Cloud Run, Cloud Build, and Container Registry APIs enabled

## Authentication Methods

You have two options for authenticating GitHub Actions with Google Cloud:

### Option 1: Service Account Key (Simpler - Recommended for Getting Started)

This method uses a service account JSON key stored as a GitHub secret.

#### Steps:

1. **Create a Service Account**
   ```bash
   # Set your project ID
   export PROJECT_ID="your-project-id"
   
   # Create service account
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions" \
     --project=$PROJECT_ID
   ```

2. **Grant Required Permissions**
   ```bash
   # Service Account Email
   export SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"
   
   # Grant Cloud Run Admin role
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/run.admin"
   
   # Grant Storage Admin role (for GCR)
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/storage.admin"
   
   # Grant Service Account User role
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/iam.serviceAccountUser"
   ```

3. **Create and Download Key**
   ```bash
   # Create key
   gcloud iam service-accounts keys create github-actions-key.json \
     --iam-account=$SA_EMAIL
   
   # The key will be saved to github-actions-key.json
   # IMPORTANT: Keep this file secure and never commit it to Git!
   ```

4. **Add Secrets to GitHub**
   
   Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret
   
   Add the following secrets:
   
   - **`GCP_SA_KEY`**: Paste the entire contents of `github-actions-key.json`
   - **`GCP_PROJECT_ID`**: Your Google Cloud Project ID (e.g., `my-project-123`)
   - **`GCP_REGION`**: Your preferred region (e.g., `us-central1`)

5. **Clean Up Local Key**
   ```bash
   # Delete the local key file for security
   rm github-actions-key.json
   ```

### Option 2: Workload Identity Federation (More Secure - Recommended for Production)

This method doesn't require storing long-lived credentials. Instead, GitHub Actions uses OIDC tokens to authenticate.

#### Steps:

1. **Create Workload Identity Pool**
   ```bash
   export PROJECT_ID="your-project-id"
   export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
   
   # Create pool
   gcloud iam workload-identity-pools create "github-actions-pool" \
     --project=$PROJECT_ID \
     --location="global" \
     --display-name="GitHub Actions Pool"
   ```

2. **Create Workload Identity Provider**
   ```bash
   # Replace GITHUB_ORG with your GitHub username or organization
   export GITHUB_ORG="your-github-username"
   export REPO_NAME="Petivolution"
   
   gcloud iam workload-identity-pools providers create-oidc "github-provider" \
     --project=$PROJECT_ID \
     --location="global" \
     --workload-identity-pool="github-actions-pool" \
     --display-name="GitHub Provider" \
     --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
     --issuer-uri="https://token.actions.githubusercontent.com"
   ```

3. **Create Service Account**
   ```bash
   gcloud iam service-accounts create github-actions-wif \
     --display-name="GitHub Actions WIF" \
     --project=$PROJECT_ID
   
   export SA_EMAIL="github-actions-wif@${PROJECT_ID}.iam.gserviceaccount.com"
   ```

4. **Grant Permissions**
   ```bash
   # Cloud Run Admin
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/run.admin"
   
   # Storage Admin
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/storage.admin"
   
   # Service Account User
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:${SA_EMAIL}" \
     --role="roles/iam.serviceAccountUser"
   ```

5. **Allow GitHub Actions to Impersonate Service Account**
   ```bash
   gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
     --project=$PROJECT_ID \
     --role="roles/iam.workloadIdentityUser" \
     --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/${GITHUB_ORG}/${REPO_NAME}"
   ```

6. **Get Provider Resource Name**
   ```bash
   gcloud iam workload-identity-pools providers describe "github-provider" \
     --project=$PROJECT_ID \
     --location="global" \
     --workload-identity-pool="github-actions-pool" \
     --format="value(name)"
   
   # Copy the output - you'll need it for GitHub secrets
   ```

7. **Add Secrets to GitHub**
   
   Add the following secrets:
   
   - **`WIF_PROVIDER`**: The full provider resource name from step 6
   - **`WIF_SERVICE_ACCOUNT`**: The service account email (e.g., `github-actions-wif@PROJECT_ID.iam.gserviceaccount.com`)
   - **`GCP_PROJECT_ID`**: Your Google Cloud Project ID
   - **`GCP_REGION`**: Your preferred region

8. **Update Workflow File**
   
   In `.github/workflows/deploy-backend.yml`, uncomment the Workload Identity section and comment out the Service Account Key section.

## Workflow Configuration

The workflow file is located at `.github/workflows/deploy-backend.yml`.

### Trigger Conditions

The workflow triggers on:
- **Push to `main` branch** when files in `backend/` change
- **Manual trigger** via GitHub Actions UI

To change the trigger branch, edit:
```yaml
on:
  push:
    branches:
      - main  # Change this to your branch name
```

### Environment Variables

Default configuration in the workflow:
- **Service Name**: `petivolution-backend`
- **Memory**: 512Mi
- **CPU**: 1
- **Timeout**: 300s
- **Max Instances**: 1 (critical!)
- **Min Instances**: 0

To modify these, edit the `Deploy to Cloud Run` step in the workflow file.

## Testing the Workflow

### First Deployment

1. **Commit and push the workflow file**
   ```bash
   git add .github/workflows/deploy-backend.yml
   git commit -m "Add GitHub Actions deployment workflow"
   git push origin main
   ```

2. **Monitor the workflow**
   - Go to your GitHub repository
   - Click "Actions" tab
   - Click on the running workflow
   - Watch the deployment progress

3. **Check the logs**
   - Each step shows detailed logs
   - Look for the service URL in the "Get Service URL" step

### Manual Trigger

To manually trigger a deployment:
1. Go to Actions tab in GitHub
2. Click "Deploy Backend to Cloud Run" workflow
3. Click "Run workflow"
4. Select branch and click "Run workflow"

## Troubleshooting

### Authentication Failures

**Error**: `ERROR: (gcloud.auth.activate-service-account) Invalid credentials`

**Solution**: 
- Verify `GCP_SA_KEY` secret is correctly set
- Ensure the service account JSON is complete and valid
- Re-create the service account key if needed

### Permission Errors

**Error**: `Permission denied` or `403 Forbidden`

**Solution**:
- Verify service account has required roles
- Check that all 3 roles are granted (run.admin, storage.admin, iam.serviceAccountUser)
- Wait a few minutes for IAM changes to propagate

### Build Failures

**Error**: `Docker build failed`

**Solution**:
- Test the build locally: `cd backend && docker build .`
- Check for TypeScript compilation errors
- Verify all dependencies are in `package.json`

### Deployment Failures

**Error**: `Cloud Run deployment failed`

**Solution**:
- Check Cloud Run quotas in Cloud Console
- Verify the service name doesn't conflict
- Check that APIs are enabled (Cloud Run, Container Registry)

### Workflow Not Triggering

**Solution**:
- Verify the workflow file is in `.github/workflows/` directory
- Check the trigger paths match your changes
- Ensure you pushed to the correct branch

## Security Best Practices

1. **Never commit credentials**: Always use GitHub Secrets for sensitive data
2. **Rotate keys regularly**: If using service account keys, rotate them periodically
3. **Use Workload Identity**: Prefer Workload Identity Federation for production
4. **Limit permissions**: Grant only the minimum required IAM roles
5. **Enable branch protection**: Require reviews before merging to `main`
6. **Use environments**: Set up GitHub Environments with protection rules

## Advanced Configuration

### Multiple Environments

To deploy to staging and production:

1. **Create separate workflows** for each environment
2. **Use different service names**: `petivolution-backend-staging`, `petivolution-backend-prod`
3. **Set up GitHub Environments** with approval requirements

### Deployment on Pull Requests

To deploy preview environments on PRs:

```yaml
on:
  pull_request:
    paths:
      - 'backend/**'
```

And modify the service name to include PR number:
```yaml
SERVICE_NAME: petivolution-backend-pr-${{ github.event.pull_request.number }}
```

### Notifications

Add Slack or Discord notifications:

```yaml
- name: Notify on Success
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Cost Considerations

- GitHub Actions provides 2,000 free minutes/month for private repos
- Cloud Build provides 120 free build-minutes/day
- Cloud Run charges for container CPU/memory during execution
- Container Registry charges for storage (~$0.026/GB/month)

## Next Steps

1. Set up authentication (choose one method above)
2. Add GitHub Secrets
3. Push workflow file to trigger first deployment
4. Monitor deployment in GitHub Actions
5. Test deployed service
6. Set up branch protection and environments (optional)
7. Configure notifications (optional)

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Workload Identity Federation Guide](https://cloud.google.com/iam/docs/workload-identity-federation)
