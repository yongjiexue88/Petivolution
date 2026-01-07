# Firebase / Firestore Setup Guide

This guide explains how to set up Firebase for the Petivolution backend.

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard
4. Enable Firestore Database:
   - Navigate to **Build** → **Firestore Database**
   - Click "Create database"
   - Choose production mode or test mode
   - Select a Cloud Firestore location

## 2. Generate Service Account Credentials

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Navigate to **Service accounts** tab
3. Click **Generate new private key**
4. Save the JSON file securely (e.g., `serviceAccountKey.json`)

> ⚠️ **Never commit this file to version control!** Add it to `.gitignore`.

## 3. Configure Backend Environment

### Option A: Using Service Account File (Local Development)

1. Place the service account JSON file in the backend directory
2. Create a `.env` file:

```bash
cd backend
cp .env.example .env
```

3. Edit `.env`:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

### Option B: Using Environment Variables (Cloud Run / Production)

1. Extract credentials from the service account JSON file
2. Set environment variables in your `.env` file:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

> 💡 For Cloud Run, set these as environment variables in the Cloud Run service configuration.

## 4. Firestore Security Rules

Set up security rules in Firestore to protect your data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Players collection - require authentication
    match /players/{playerId} {
      allow read, write: if request.auth != null && request.auth.uid == playerId;
    }
    
    // Worlds collection - server-only access
    match /worlds/{worldId} {
      allow read: if true;  // Public read for game data
      allow write: if false;  // Only server can write
    }
    
    // Chunks collection - public read, server write
    match /chunks/{chunkId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

> 📝 Adjust these rules based on your authentication strategy.

## 5. Test the Connection

1. Start the backend server:

```bash
cd backend
npm run dev
```

2. Check the logs for Firebase initialization:

```
✅ Firebase initialized successfully
🌍 World Server running on port 3000
```

3. Test the health endpoint:

```bash
curl http://localhost:3000/health
```

## 6. Testing with Firebase Emulator (Optional)

For local development without connecting to production:

1. Install Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Initialize emulators:

```bash
firebase init emulators
```

3. Start Firestore emulator:

```bash
firebase emulators:start --only firestore
```

4. Update backend to use emulator in `.env`:

```env
FIRESTORE_EMULATOR_HOST=localhost:8080
```

## Firestore Collections Structure

### `players/{playerId}`

```json
{
  "playerId": "user-123",
  "name": "Player Name",
  "gp": 100,
  "maxGp": 100,
  "quotas": {
    "spawnPerDay": 50,
    "placementsPerDay": 100
  },
  "rateLimiting": {
    "lastSpawnTime": 1234567890,
    "lastPlacementTime": 1234567890,
    "spawnCountToday": 0,
    "placementCountToday": 0
  },
  "pinList": ["world-1", "world-2"],
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

### `worlds/main`

```json
{
  "seed": 12345,
  "tick": 1000,
  "rulesVersion": "v1.0",
  "latestSnapshotPath": "gs://bucket/saves/world-123.json",
  "createdAt": 1234567890,
  "updatedAt": 1234567890
}
```

### `chunks/{cx}_{cy}`

```json
{
  "chunkId": "0_0",
  "cx": 0,
  "cy": 0,
  "stats": {
    "ratCount": 5,
    "catCount": 2,
    "resourceIndex": 0.7,
    "riskIndex": 0.3
  },
  "objects": [
    {
      "id": "obj-123",
      "type": "water",
      "tx": 10,
      "ty": 15
    }
  ],
  "updatedAt": 1234567890
}
```

## API Endpoints

All endpoints are documented in the implementation plan. Key endpoints:

- **Player**: `GET/POST /api/player/:playerId`
- **World**: `GET/PATCH /api/world/metadata`
- **Chunks**: `GET/PATCH /api/chunks/:cx/:cy`

See the full API documentation in the implementation plan.
