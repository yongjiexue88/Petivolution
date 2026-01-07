import { Storage } from '@google-cloud/storage';

let storageInstance: Storage | null = null;
let bucketName: string | null = null;

/**
 * Initialize Google Cloud Storage
 * 
 * Uses the same authentication as Firebase Admin:
 * - Service account file path
 * - Environment variables
 * - Default credentials (for Cloud Run)
 */
export function initializeStorage(): Storage {
    if (storageInstance) {
        return storageInstance;
    }

    try {
        // Initialize with same credentials as Firebase
        if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
            storageInstance = new Storage({
                projectId: serviceAccount.project_id,
                credentials: serviceAccount,
            });
            console.log('✅ Cloud Storage initialized from service account file');
        } else if (process.env.FIREBASE_PROJECT_ID) {
            storageInstance = new Storage({
                projectId: process.env.FIREBASE_PROJECT_ID,
            });
            console.log('✅ Cloud Storage initialized with project credentials');
        } else {
            // Default credentials (Cloud Run / GCP)
            storageInstance = new Storage();
            console.log('✅ Cloud Storage initialized with default credentials');
        }

        // Set bucket name
        bucketName = process.env.GCS_BUCKET_NAME || 'petivolution-snapshots';

        return storageInstance;
    } catch (error: any) {
        console.error('❌ Failed to initialize Cloud Storage:', error.message);
        throw new Error(`Cloud Storage initialization failed: ${error.message}`);
    }
}

/**
 * Get the storage bucket instance
 */
export function getStorageBucket() {
    if (!storageInstance) {
        initializeStorage();
    }

    if (!storageInstance || !bucketName) {
        throw new Error('Cloud Storage not initialized');
    }

    return storageInstance.bucket(bucketName);
}

/**
 * Get bucket name
 */
export function getBucketName(): string {
    return bucketName || process.env.GCS_BUCKET_NAME || 'petivolution-snapshots';
}

/**
 * Check if Cloud Storage is initialized
 */
export function isStorageInitialized(): boolean {
    return storageInstance !== null;
}

/**
 * Create bucket if it doesn't exist
 */
export async function ensureBucketExists(): Promise<void> {
    try {
        const bucket = getStorageBucket();
        const [exists] = await bucket.exists();

        if (!exists) {
            console.log(`Creating bucket: ${getBucketName()}`);
            await bucket.create({
                location: 'US',
                storageClass: 'STANDARD',
            });
            console.log(`✅ Bucket created: ${getBucketName()}`);
        } else {
            console.log(`✅ Bucket exists: ${getBucketName()}`);
        }
    } catch (error: any) {
        console.error('Error ensuring bucket exists:', error.message);
        throw error;
    }
}
