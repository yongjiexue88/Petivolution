import { getFirestore, isFirebaseInitialized } from '../config/firebaseConfig';
import { EntityRuntime } from '../shared/types';

const COLLECTION_BASE = 'worlds/main/entities';

/**
 * Entity Service - Handles entity persistence in Firestore
 */
export class EntityService {
    /**
     * Save an entity to Firestore
     */
    static async saveEntity(entity: EntityRuntime): Promise<void> {
        if (!isFirebaseInitialized()) {
            console.warn('[EntityService] Firebase not initialized, skipping save');
            return;
        }

        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION_BASE).doc(entity.id);

            // Convert entity to Firestore-safe format
            const entityData = {
                id: entity.id,
                species: entity.species,
                name: entity.name,
                personality: entity.personality,
                pos: { x: entity.pos.x, y: entity.pos.y },
                vel: { x: entity.vel.x, y: entity.vel.y },
                facing: entity.facing,
                vitals: entity.vitals,
                ageTicks: entity.ageTicks,
                state: entity.state,
                targetEntityId: entity.targetEntityId || null,
                targetObjectId: entity.targetObjectId || null,
                targetPos: entity.targetPos ? { x: entity.targetPos.x, y: entity.targetPos.y } : null,
                generation: entity.generation,
                parents: entity.parents || [],
                children: entity.children || [],
                updatedAt: Date.now(),
            };

            await docRef.set(entityData, { merge: true });
            console.log(`✅ Entity saved: ${entity.name} (${entity.id})`);
        } catch (error: any) {
            console.error(`Error saving entity ${entity.id}:`, error.message);
        }
    }

    /**
     * Delete an entity from Firestore (when it dies)
     */
    static async deleteEntity(entityId: string): Promise<void> {
        if (!isFirebaseInitialized()) {
            return;
        }

        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION_BASE).doc(entityId);
            await docRef.delete();
            console.log(`🗑️ Entity deleted: ${entityId}`);
        } catch (error: any) {
            console.error(`Error deleting entity ${entityId}:`, error.message);
        }
    }

    /**
     * Get all entities from Firestore
     */
    static async getAllEntities(): Promise<any[]> {
        if (!isFirebaseInitialized()) {
            return [];
        }

        try {
            const db = getFirestore();
            const snapshot = await db.collection(COLLECTION_BASE).get();
            const entities: any[] = [];

            snapshot.forEach((doc) => {
                entities.push(doc.data());
            });

            console.log(`📥 Loaded ${entities.length} entities from Firestore`);
            return entities;
        } catch (error: any) {
            console.error('Error getting entities:', error.message);
            return [];
        }
    }

    /**
     * Batch save multiple entities (more efficient)
     */
    static async batchSaveEntities(entities: EntityRuntime[]): Promise<void> {
        if (!isFirebaseInitialized() || entities.length === 0) {
            return;
        }

        try {
            const db = getFirestore();
            const batch = db.batch();
            const now = Date.now();

            for (const entity of entities) {
                const docRef = db.collection(COLLECTION_BASE).doc(entity.id);
                const entityData = {
                    id: entity.id,
                    species: entity.species,
                    name: entity.name,
                    personality: entity.personality,
                    pos: { x: entity.pos.x, y: entity.pos.y },
                    facing: entity.facing,
                    vitals: entity.vitals,
                    ageTicks: entity.ageTicks,
                    state: entity.state,
                    generation: entity.generation,
                    updatedAt: now,
                };
                batch.set(docRef, entityData, { merge: true });
            }

            await batch.commit();
            console.log(`✅ Batch saved ${entities.length} entities`);
        } catch (error: any) {
            console.error('Error batch saving entities:', error.message);
        }
    }

    /**
     * Clear all entities (for world reset)
     */
    static async clearAllEntities(): Promise<void> {
        if (!isFirebaseInitialized()) {
            return;
        }

        try {
            const db = getFirestore();
            const snapshot = await db.collection(COLLECTION_BASE).get();
            const batch = db.batch();

            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`🗑️ Cleared all entities from Firestore`);
        } catch (error: any) {
            console.error('Error clearing entities:', error.message);
        }
    }
}
