# Firebase Hosting Setup Guide

This guide shows you how to deploy your frontend to Firebase Hosting with a custom domain and auto-deployment via GitHub Actions.

## 🚀 Quick Setup

### 1. Initialize Firebase Hosting

```bash
cd frontend

# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting
firebase init hosting
```

**Configuration options:**
- Project: Select `petivolution`
- Public directory: `dist`
- Single-page app: `Yes`
- Set up automatic builds: `No` (we'll use GitHub Actions)
- Overwrite index.html: `No`

---

### 2. Set Up GitHub Secrets

Go to [GitHub Repository Secrets](https://github.com/yongjiexue88/Petivolution/settings/secrets/actions)

Click **"New repository secret"** and add:

#### FIREBASE_SERVICE_ACCOUNT

1. Run this command:
```bash
firebase login:ci
```

2. Copy the token and paste it as the secret value

**OR** use the service account JSON:

```bash
cat backend/serviceAccountKey.json
```

Copy the entire JSON and paste it as the secret value.

#### VITE_API_URL (Optional)

Set your backend URL:
```
https://petivolution-backend-YOUR-ID.run.app
```

---

### 3. Manual Deploy (First Time)

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

You'll get a URL like: `https://petivolution.web.app`

---

## 🌐 Custom Domain Setup

### Step 1: Add Custom Domain in Firebase

1. Go to [Firebase Console → Hosting](https://console.firebase.google.com/project/petivolution/hosting)
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `petivolution.com`)
4. Firebase will give you DNS records to add

### Step 2: Add DNS Records

Firebase will show you records like:

**For root domain (`petivolution.com`):**
```
Type: A
Name: @
Value: 151.101.1.195
       151.101.65.195
```

**For www subdomain (`www.petivolution.com`):**
```
Type: CNAME
Name: www
Value: petivolution.web.app
```

### Step 3: Add to Your Domain Registrar

**If using Namecheap:**
1. Go to Domain List → Manage → Advanced DNS
2. Add the A records and CNAME record
3. Save changes

**If using GoDaddy:**
1. Go to DNS Management
2. Add the A records and CNAME record
3. Save

**If using Cloudflare:**
1. Go to DNS settings
2. Add the A records and CNAME record
3. **Important**: Set Proxy status to "DNS only" (grey cloud)

### Step 4: Verify Domain

Back in Firebase Console:
1. Click **"Verify"**
2. Wait 5-10 minutes for DNS propagation
3. Firebase will automatically provision SSL certificate

Once verified, your site will be live at:
- `https://petivolution.com` ✅
- `https://www.petivolution.com` ✅

---

## 🤖 Auto-Deployment

The GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`) automatically deploys when:
- You push to `main` branch
- Any file in `frontend/` changes

**How it works:**
1. Checks out code
2. Installs dependencies
3. Builds frontend (`npm run build`)
4. Deploys to Firebase Hosting

**To trigger manually:**
1. Go to [Actions tab](https://github.com/yongjiexue88/Petivolution/actions)
2. Select "Deploy Frontend to Firebase Hosting"
3. Click "Run workflow"

---

## 📝 Environment Variables

Update `frontend/.env.production`:

```env
VITE_API_URL=https://petivolution-backend-YOUR-ID.run.app
```

Or set in GitHub Secrets as `VITE_API_URL`.

---

## 🎯 Testing URLs

After deployment, test:

1. **Firebase default URL:**
   ```
   https://petivolution.web.app
   https://petivolution.firebaseapp.com
   ```

2. **Custom domain (after DNS setup):**
   ```
   https://petivolution.com
   https://www.petivolution.com
   ```

---

## 🔧 Rollback

If you need to rollback a deployment:

```bash
firebase hosting:channel:deploy preview
```

Or in Firebase Console → Hosting → Release History → **"Rollback"**

---

## 💰 Pricing

Firebase Hosting **Free Tier:**
- 10 GB storage
- 360 MB/day bandwidth
- SSL certificate included
- Custom domain included

Plenty for most projects!

---

## 📚 Useful Commands

```bash
# Deploy to preview channel
firebase hosting:channel:deploy preview

# Deploy to production
firebase deploy --only hosting

# View deployed sites
firebase hosting:sites:list

# Delete old deployments
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID TARGET_SITE_ID:live
```

---

## ✅ Quick Checklist

- [ ] Run `firebase init hosting` in frontend folder
- [ ] Add `FIREBASE_SERVICE_ACCOUNT` to GitHub Secrets
- [ ] Push to main to trigger auto-deploy
- [ ] Verify deployment at `petivolution.web.app`
- [ ] Buy custom domain (if needed)
- [ ] Add custom domain in Firebase Console
- [ ] Update DNS records at domain registrar
- [ ] Wait for SSL certificate (5-24 hours)
- [ ] Test custom domain

Your frontend will auto-deploy on every push to main! 🚀
