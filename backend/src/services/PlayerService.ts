import { getFirestore } from '../config/firebaseConfig';
import {
    PlayerData,
    PlayerQuotas,
    DEFAULT_PLAYER_DATA,
    playerDataConverter,
} from '../models/PlayerData';

const COLLECTION = 'players';

/**
 * Player Service - Handles all player data operations
 */
export class PlayerService {
    /**
     * Get player data by ID
     */
    static async getPlayer(playerId: string): Promise<PlayerData | null> {
        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION).doc(playerId);
            const doc = await docRef.withConverter(playerDataConverter).get();

            if (!doc.exists) {
                return null;
            }

            return doc.data() || null;
        } catch (error: any) {
            console.error(`Error getting player ${playerId}:`, error);
            throw new Error(`Failed to get player: ${error.message}`);
        }
    }

    /**
     * Create a new player
     */
    static async createPlayer(playerId: string, name: string): Promise<PlayerData> {
        try {
            const db = getFirestore();
            const now = Date.now();

            const newPlayer: PlayerData = {
                ...DEFAULT_PLAYER_DATA,
                playerId,
                name,
                createdAt: now,
                updatedAt: now,
            };

            const docRef = db.collection(COLLECTION).doc(playerId);
            await docRef.set(newPlayer);

            console.log(`✅ Created player: ${playerId} (${name})`);
            return newPlayer;
        } catch (error: any) {
            console.error(`Error creating player ${playerId}:`, error);
            throw new Error(`Failed to create player: ${error.message}`);
        }
    }

    /**
     * Update player's God Power
     */
    static async updateGP(playerId: string, delta: number): Promise<void> {
        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION).doc(playerId);

            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(docRef);
                if (!doc.exists) {
                    throw new Error('Player not found');
                }

                const data = doc.data() as PlayerData;
                const newGP = Math.max(0, Math.min(data.maxGp, data.gp + delta));

                transaction.update(docRef, {
                    gp: newGP,
                    updatedAt: Date.now(),
                });
            });

            console.log(`✅ Updated GP for player ${playerId}: ${delta > 0 ? '+' : ''}${delta}`);
        } catch (error: any) {
            console.error(`Error updating GP for player ${playerId}:`, error);
            throw new Error(`Failed to update GP: ${error.message}`);
        }
    }

    /**
     * Update player quotas
     */
    static async updateQuotas(playerId: string, quotas: Partial<PlayerQuotas>): Promise<void> {
        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION).doc(playerId);

            await docRef.update({
                quotas,
                updatedAt: Date.now(),
            });

            console.log(`✅ Updated quotas for player ${playerId}`);
        } catch (error: any) {
            console.error(`Error updating quotas for player ${playerId}:`, error);
            throw new Error(`Failed to update quotas: ${error.message}`);
        }
    }

    /**
     * Add a world ID to player's pin list
     */
    static async addPin(playerId: string, worldId: string): Promise<void> {
        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION).doc(playerId);

            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(docRef);
                if (!doc.exists) {
                    throw new Error('Player not found');
                }

                const data = doc.data() as PlayerData;
                if (!data.pinList.includes(worldId)) {
                    transaction.update(docRef, {
                        pinList: [...data.pinList, worldId],
                        updatedAt: Date.now(),
                    });
                }
            });

            console.log(`✅ Added pin ${worldId} for player ${playerId}`);
        } catch (error: any) {
            console.error(`Error adding pin for player ${playerId}:`, error);
            throw new Error(`Failed to add pin: ${error.message}`);
        }
    }

    /**
     * Remove a world ID from player's pin list
     */
    static async removePin(playerId: string, worldId: string): Promise<void> {
        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION).doc(playerId);

            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(docRef);
                if (!doc.exists) {
                    throw new Error('Player not found');
                }

                const data = doc.data() as PlayerData;
                transaction.update(docRef, {
                    pinList: data.pinList.filter(id => id !== worldId),
                    updatedAt: Date.now(),
                });
            });

            console.log(`✅ Removed pin ${worldId} for player ${playerId}`);
        } catch (error: any) {
            console.error(`Error removing pin for player ${playerId}:`, error);
            throw new Error(`Failed to remove pin: ${error.message}`);
        }
    }

    /**
     * Check rate limit for a specific action
     */
    static async checkRateLimit(
        playerId: string,
        action: 'spawn' | 'place'
    ): Promise<{ allowed: boolean; remaining: number; resetsAt: number }> {
        try {
            const player = await this.getPlayer(playerId);
            if (!player) {
                throw new Error('Player not found');
            }

            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;

            // Reset counters if a new day has started
            const lastActionTime = action === 'spawn'
                ? player.rateLimiting.lastSpawnTime
                : player.rateLimiting.lastPlacementTime;

            const isDifferentDay = now - lastActionTime > oneDayMs;
            const currentCount = isDifferentDay ? 0 : (
                action === 'spawn'
                    ? player.rateLimiting.spawnCountToday
                    : player.rateLimiting.placementCountToday
            );

            const quota = action === 'spawn'
                ? player.quotas.spawnPerDay
                : player.quotas.placementsPerDay;

            const allowed = currentCount < quota;
            const remaining = Math.max(0, quota - currentCount);
            const resetsAt = lastActionTime + oneDayMs;

            return { allowed, remaining, resetsAt };
        } catch (error: any) {
            console.error(`Error checking rate limit for player ${playerId}:`, error);
            throw new Error(`Failed to check rate limit: ${error.message}`);
        }
    }

    /**
     * Record an action (for rate limiting)
     */
    static async recordAction(playerId: string, action: 'spawn' | 'place'): Promise<void> {
        try {
            const db = getFirestore();
            const docRef = db.collection(COLLECTION).doc(playerId);

            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(docRef);
                if (!doc.exists) {
                    throw new Error('Player not found');
                }

                const data = doc.data() as PlayerData;
                const now = Date.now();
                const oneDayMs = 24 * 60 * 60 * 1000;

                if (action === 'spawn') {
                    const isDifferentDay = now - data.rateLimiting.lastSpawnTime > oneDayMs;
                    transaction.update(docRef, {
                        'rateLimiting.lastSpawnTime': now,
                        'rateLimiting.spawnCountToday': isDifferentDay ? 1 : data.rateLimiting.spawnCountToday + 1,
                        updatedAt: now,
                    });
                } else {
                    const isDifferentDay = now - data.rateLimiting.lastPlacementTime > oneDayMs;
                    transaction.update(docRef, {
                        'rateLimiting.lastPlacementTime': now,
                        'rateLimiting.placementCountToday': isDifferentDay ? 1 : data.rateLimiting.placementCountToday + 1,
                        updatedAt: now,
                    });
                }
            });

            console.log(`✅ Recorded ${action} action for player ${playerId}`);
        } catch (error: any) {
            console.error(`Error recording action for player ${playerId}:`, error);
            throw new Error(`Failed to record action: ${error.message}`);
        }
    }
}
