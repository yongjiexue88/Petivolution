import { getFirestore } from '../config/firebaseConfig';
import {
    WorldMetadata,
    DEFAULT_WORLD_METADATA,
    worldMetadataConverter,
} from '../models/WorldMetadata';

const COLLECTION = 'worlds';
const MAIN_WORLD_ID = 'main';

/**
 * World Service - Handles world metadata operations
 */
export class WorldService {
    /**
     * Get world metadata
     */
    static async getWorldMetadata(): Promise<WorldMetadata | null> {
        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION).doc(MAIN_WORLD_ID);
            const doc = await docRef.withConverter(worldMetadataConverter).get();

            if (!doc.exists) {
                return null;
            }

            return doc.data() || null;
        } catch (error: any) {
            console.error('Error getting world metadata:', error);
            throw new Error(`Failed to get world metadata: ${error.message}`);
        }
    }

    /**
     * Initialize world metadata (create if doesn't exist)
     */
    static async initializeWorld(seed?: number): Promise<WorldMetadata> {
        try {
            const db = getFirestore();
            const now = Date.now();

            const worldData: WorldMetadata = {
                ...DEFAULT_WORLD_METADATA,
                seed: seed || DEFAULT_WORLD_METADATA.seed,
                createdAt: now,
                updatedAt: now,
            };

            const docRef = db.collection(COLLECTION).doc(MAIN_WORLD_ID);
            await docRef.set(worldData);

            console.log(`✅ Initialized world with seed: ${worldData.seed}`);
            return worldData;
        } catch (error: any) {
            console.error('Error initializing world:', error);
            throw new Error(`Failed to initialize world: ${error.message}`);
        }
    }

    /**
     * Update world metadata
     */
    static async updateWorldMetadata(updates: Partial<Omit<WorldMetadata, 'createdAt' | 'updatedAt'>>): Promise<void> {
        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION).doc(MAIN_WORLD_ID);

            await docRef.update({
                ...updates,
                updatedAt: Date.now(),
            });

            console.log('✅ Updated world metadata');
        } catch (error: any) {
            console.error('Error updating world metadata:', error);
            throw new Error(`Failed to update world metadata: ${error.message}`);
        }
    }

    /**
     * Update current tick
     */
    static async updateTick(tick: number): Promise<void> {
        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION).doc(MAIN_WORLD_ID);

            await docRef.update({
                tick,
                updatedAt: Date.now(),
            });
        } catch (error: any) {
            console.error('Error updating tick:', error);
            throw new Error(`Failed to update tick: ${error.message}`);
        }
    }

    /**
     * Update latest snapshot path
     */
    static async updateSnapshotPath(path: string): Promise<void> {
        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION).doc(MAIN_WORLD_ID);

            await docRef.update({
                latestSnapshotPath: path,
                updatedAt: Date.now(),
            });

            console.log(`✅ Updated snapshot path: ${path}`);
        } catch (error: any) {
            console.error('Error updating snapshot path:', error);
            throw new Error(`Failed to update snapshot path: ${error.message}`);
        }
    }

    /**
     * Update rules version
     */
    static async updateRulesVersion(version: string): Promise<void> {
        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION).doc(MAIN_WORLD_ID);

            await docRef.update({
                rulesVersion: version,
                updatedAt: Date.now(),
            });

            console.log(`✅ Updated rules version: ${version}`);
        } catch (error: any) {
            console.error('Error updating rules version:', error);
            throw new Error(`Failed to update rules version: ${error.message}`);
        }
    }
}
