import { getFirestore } from '../config/firebaseConfig';
import {
    ChunkData,
    ChunkStatistics,
    StaticObject,
    createChunkData,
    chunkDataConverter,
    MAX_OBJECTS_PER_CHUNK,
} from '../models/ChunkData';

const COLLECTION = 'chunks';

/**
 * Chunk update structure for batch operations
 */
export interface ChunkUpdate {
    cx: number;
    cy: number;
    stats?: Partial<ChunkStatistics>;
    objectsToAdd?: StaticObject[];
    objectIdsToRemove?: string[];
}

/**
 * Chunk Service - Handles chunk data operations
 */
export class ChunkService {
    /**
     * Get chunk data by coordinates
     */
    static async getChunk(cx: number, cy: number): Promise<ChunkData | null> {
        try {
            const db = getFirestore();
            const chunkId = `${cx}_${cy}`;
            const docRef = db.collection(COLLECTION).doc(chunkId);
            const doc = await docRef.withConverter(chunkDataConverter).get();

            if (!doc.exists) {
                return null;
            }

            return doc.data() || null;
        } catch (error: any) {
            console.error(`Error getting chunk (${cx}, ${cy}):`, error);
            throw new Error(`Failed to get chunk: ${error.message}`);
        }
    }

    /**
     * Create or update chunk statistics
     */
    static async updateChunkStats(
        cx: number,
        cy: number,
        stats: Partial<ChunkStatistics>
    ): Promise<void> {
        try {
            const db = getFirestore();
            const chunkId = `${cx}_${cy}`;
            const docRef = db.collection(COLLECTION).doc(chunkId);

            // Check if chunk exists
            const doc = await docRef.get();

            if (!doc.exists) {
                // Create new chunk
                const newChunk = createChunkData(cx, cy);
                newChunk.stats = { ...newChunk.stats, ...stats };
                await docRef.set(newChunk);
                console.log(`✅ Created chunk (${cx}, ${cy})`);
            } else {
                // Update existing chunk
                await docRef.update({
                    'stats': { ...doc.data()?.stats, ...stats },
                    updatedAt: Date.now(),
                });
                console.log(`✅ Updated chunk stats (${cx}, ${cy})`);
            }
        } catch (error: any) {
            console.error(`Error updating chunk stats (${cx}, ${cy}):`, error);
            throw new Error(`Failed to update chunk stats: ${error.message}`);
        }
    }

    /**
     * Add a static object to a chunk
     */
    static async addStaticObject(cx: number, cy: number, obj: StaticObject): Promise<void> {
        try {
            const db = getFirestore();
            const chunkId = `${cx}_${cy}`;
            const docRef = db.collection(COLLECTION).doc(chunkId);

            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(docRef);

                let chunkData: ChunkData;
                if (!doc.exists) {
                    chunkData = createChunkData(cx, cy);
                } else {
                    chunkData = doc.data() as ChunkData;
                }

                // Check object limit
                if (chunkData.objects.length >= MAX_OBJECTS_PER_CHUNK) {
                    throw new Error(`Chunk (${cx}, ${cy}) has reached maximum object limit (${MAX_OBJECTS_PER_CHUNK})`);
                }

                // Add object if not already present
                if (!chunkData.objects.find(o => o.id === obj.id)) {
                    chunkData.objects.push(obj);
                    chunkData.updatedAt = Date.now();

                    if (!doc.exists) {
                        transaction.set(docRef, chunkData);
                    } else {
                        transaction.update(docRef, {
                            objects: chunkData.objects,
                            updatedAt: chunkData.updatedAt,
                        });
                    }
                }
            });

            console.log(`✅ Added object ${obj.id} to chunk (${cx}, ${cy})`);
        } catch (error: any) {
            console.error(`Error adding object to chunk (${cx}, ${cy}):`, error);
            throw new Error(`Failed to add object: ${error.message}`);
        }
    }

    /**
     * Remove a static object from a chunk
     */
    static async removeStaticObject(cx: number, cy: number, objectId: string): Promise<void> {
        try {
            const db = getFirestore();
            const chunkId = `${cx}_${cy}`;
            const docRef = db.collection(COLLECTION).doc(chunkId);

            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(docRef);
                if (!doc.exists) {
                    throw new Error(`Chunk (${cx}, ${cy}) not found`);
                }

                const chunkData = doc.data() as ChunkData;
                const filteredObjects = chunkData.objects.filter(o => o.id !== objectId);

                transaction.update(docRef, {
                    objects: filteredObjects,
                    updatedAt: Date.now(),
                });
            });

            console.log(`✅ Removed object ${objectId} from chunk (${cx}, ${cy})`);
        } catch (error: any) {
            console.error(`Error removing object from chunk (${cx}, ${cy}):`, error);
            throw new Error(`Failed to remove object: ${error.message}`);
        }
    }

    /**
     * Batch update multiple chunks
     */
    static async batchUpdateChunks(updates: ChunkUpdate[]): Promise<void> {
        try {
            const db = getFirestore();
            const batch = db.batch();

            for (const update of updates) {
                const chunkId = `${update.cx}_${update.cy}`;
                const docRef = db.collection(COLLECTION).doc(chunkId);

                // For batch operations, we need to get the document first
                // Note: This is a limitation of Firestore batch writes - they can't read
                // For true atomic updates, use transactions instead
                const doc = await docRef.get();

                if (!doc.exists) {
                    // Create new chunk
                    const newChunk = createChunkData(update.cx, update.cy);
                    if (update.stats) {
                        newChunk.stats = { ...newChunk.stats, ...update.stats };
                    }
                    if (update.objectsToAdd) {
                        newChunk.objects = update.objectsToAdd;
                    }
                    batch.set(docRef, newChunk);
                } else {
                    // Update existing chunk
                    const chunkData = doc.data() as ChunkData;
                    const updateData: any = { updatedAt: Date.now() };

                    if (update.stats) {
                        updateData.stats = { ...chunkData.stats, ...update.stats };
                    }

                    if (update.objectsToAdd || update.objectIdsToRemove) {
                        let objects = [...chunkData.objects];

                        if (update.objectIdsToRemove) {
                            objects = objects.filter(
                                o => !update.objectIdsToRemove!.includes(o.id)
                            );
                        }

                        if (update.objectsToAdd) {
                            for (const obj of update.objectsToAdd) {
                                if (!objects.find(o => o.id === obj.id)) {
                                    objects.push(obj);
                                }
                            }
                        }

                        // Check object limit
                        if (objects.length > MAX_OBJECTS_PER_CHUNK) {
                            console.warn(
                                `Chunk (${update.cx}, ${update.cy}) exceeds object limit. Truncating to ${MAX_OBJECTS_PER_CHUNK} objects.`
                            );
                            objects = objects.slice(0, MAX_OBJECTS_PER_CHUNK);
                        }

                        updateData.objects = objects;
                    }

                    batch.update(docRef, updateData);
                }
            }

            await batch.commit();
            console.log(`✅ Batch updated ${updates.length} chunks`);
        } catch (error: any) {
            console.error('Error batch updating chunks:', error);
            throw new Error(`Failed to batch update chunks: ${error.message}`);
        }
    }

    /**
     * Get multiple chunks by coordinates
     */
    static async getChunks(coordinates: Array<{ cx: number; cy: number }>): Promise<Map<string, ChunkData>> {
        try {
            const db = getFirestore();
            const result = new Map<string, ChunkData>();

            // Firestore has a limit of 10 documents per getAll()
            // We'll batch the requests if needed
            const batchSize = 10;
            for (let i = 0; i < coordinates.length; i += batchSize) {
                const batch = coordinates.slice(i, i + batchSize);
                const docRefs = batch.map(({ cx, cy }) =>
                    db.collection(COLLECTION).doc(`${cx}_${cy}`)
                );

                const docs = await db.getAll(...docRefs);

                docs.forEach((doc, index) => {
                    if (doc.exists) {
                        const data = doc.data() as ChunkData;
                        result.set(data.chunkId, data);
                    }
                });
            }

            return result;
        } catch (error: any) {
            console.error('Error getting multiple chunks:', error);
            throw new Error(`Failed to get chunks: ${error.message}`);
        }
    }
}
