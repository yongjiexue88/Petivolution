import { getFirestore, isFirebaseInitialized } from '../config/firebaseConfig';
import { SimEvent, EntityRuntime } from '../shared/types';

const EVENTS_COLLECTION = 'worlds/main/events';
const GRAVEYARD_COLLECTION = 'worlds/main/graveyard';

/**
 * Event Service - Handles event logging in Firestore
 */
export class EventService {
    /**
     * Log a simulation event
     */
    static async logEvent(event: SimEvent): Promise<void> {
        if (!isFirebaseInitialized()) {
            return;
        }

        try {
            const db = getFirestore();
            const docRef = db.collection(EVENTS_COLLECTION).doc();

            await docRef.set({
                ...event,
                createdAt: Date.now(),
            });
        } catch (error: any) {
            // Don't spam logs for event failures
            console.warn(`Event log failed: ${error.message}`);
        }
    }

    /**
     * Log multiple events in batch
     */
    static async logEvents(events: SimEvent[]): Promise<void> {
        if (!isFirebaseInitialized() || events.length === 0) {
            return;
        }

        try {
            const db = getFirestore();
            const batch = db.batch();
            const now = Date.now();

            for (const event of events) {
                const docRef = db.collection(EVENTS_COLLECTION).doc();
                batch.set(docRef, {
                    ...event,
                    createdAt: now,
                });
            }

            await batch.commit();
            console.log(`📝 Logged ${events.length} events`);
        } catch (error: any) {
            console.warn(`Batch event log failed: ${error.message}`);
        }
    }

    /**
     * Get recent events
     */
    static async getRecentEvents(limit: number = 50): Promise<SimEvent[]> {
        if (!isFirebaseInitialized()) {
            return [];
        }

        try {
            const db = getFirestore();
            const snapshot = await db
                .collection(EVENTS_COLLECTION)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const events: SimEvent[] = [];
            snapshot.forEach((doc) => {
                events.push(doc.data() as SimEvent);
            });

            return events;
        } catch (error: any) {
            console.error('Error getting events:', error.message);
            return [];
        }
    }

    /**
     * Log entity death to graveyard
     */
    static async logToGraveyard(entity: EntityRuntime, cause: string): Promise<void> {
        if (!isFirebaseInitialized()) {
            return;
        }

        try {
            const db = getFirestore();
            const docRef = db.collection(GRAVEYARD_COLLECTION).doc(entity.id);

            await docRef.set({
                id: entity.id,
                species: entity.species,
                name: entity.name,
                personality: entity.personality,
                generation: entity.generation,
                ageTicks: entity.ageTicks,
                deathCause: cause,
                killedBy: entity.dead?.killedBy || null,
                deathTick: entity.dead?.atTick || null,
                parents: entity.parents || [],
                children: entity.children || [],
                diedAt: Date.now(),
            });

            console.log(`⚰️ ${entity.name} added to graveyard (${cause})`);
        } catch (error: any) {
            console.error(`Error logging to graveyard: ${error.message}`);
        }
    }

    /**
     * Get graveyard entries
     */
    static async getGraveyard(limit: number = 100): Promise<any[]> {
        if (!isFirebaseInitialized()) {
            return [];
        }

        try {
            const db = getFirestore();
            const snapshot = await db
                .collection(GRAVEYARD_COLLECTION)
                .orderBy('diedAt', 'desc')
                .limit(limit)
                .get();

            const entries: any[] = [];
            snapshot.forEach((doc) => {
                entries.push(doc.data());
            });

            return entries;
        } catch (error: any) {
            console.error('Error getting graveyard:', error.message);
            return [];
        }
    }

    /**
     * Clear old events (retention policy)
     */
    static async clearOldEvents(retentionHours: number = 24): Promise<number> {
        if (!isFirebaseInitialized()) {
            return 0;
        }

        try {
            const db = getFirestore();
            const cutoff = Date.now() - retentionHours * 60 * 60 * 1000;

            const snapshot = await db
                .collection(EVENTS_COLLECTION)
                .where('createdAt', '<', cutoff)
                .get();

            if (snapshot.empty) {
                return 0;
            }

            const batch = db.batch();
            snapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`🗑️ Cleared ${snapshot.size} old events`);
            return snapshot.size;
        } catch (error: any) {
            console.error('Error clearing old events:', error.message);
            return 0;
        }
    }
}
