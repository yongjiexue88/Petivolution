import admin from 'firebase-admin';
import { Firestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

let firestoreInstance: Firestore | null = null;
let adminInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * 
 * Supports two configuration methods:
 * 1. Environment variables (recommended for Cloud Run):
 *    - FIREBASE_PROJECT_ID
 *    - FIREBASE_CLIENT_EMAIL
 *    - FIREBASE_PRIVATE_KEY
 * 
 * 2. Service account file path:
 *    - FIREBASE_SERVICE_ACCOUNT_PATH
 */
export function initializeFirebase(): admin.app.App {
    if (adminInitialized) {
        return admin.app();
    }

    try {
        // Method 1: Service account file path
        if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('✅ Firebase initialized from service account file');
        }
        // Method 2: Environment variables
        else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            });
            console.log('✅ Firebase initialized from environment variables');
        }
        // Method 3: Default credentials (for Cloud Run / GCP)
        else {
            admin.initializeApp();
            console.log('✅ Firebase initialized with default credentials');
        }

        adminInitialized = true;
        return admin.app();
    } catch (error: any) {
        console.error('❌ Failed to initialize Firebase:', error.message);
        throw new Error(`Firebase initialization failed: ${error.message}`);
    }
}

/**
 * Get Firestore instance (singleton)
 */
export function getFirestore(): Firestore {
    if (!firestoreInstance) {
        if (!adminInitialized) {
            initializeFirebase();
        }
        firestoreInstance = admin.firestore();

        // Firestore settings
        firestoreInstance.settings({
            ignoreUndefinedProperties: true,
        });
    }
    return firestoreInstance;
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
    return adminInitialized;
}
