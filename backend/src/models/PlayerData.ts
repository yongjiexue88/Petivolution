/**
 * Player Data Model
 * 
 * Stored in Firestore collection: players/{playerId}
 */

export interface PlayerQuotas {
    spawnPerDay: number;
    placementsPerDay: number;
}

export interface PlayerRateLimiting {
    lastSpawnTime: number;      // Unix timestamp (ms)
    lastPlacementTime: number;  // Unix timestamp (ms)
    spawnCountToday: number;
    placementCountToday: number;
}

export interface PlayerData {
    playerId: string;
    name: string;
    gp: number;                    // God Power (current)
    maxGp: number;                 // Maximum GP capacity

    quotas: PlayerQuotas;
    rateLimiting: PlayerRateLimiting;

    pinList: string[];             // Array of pinned world/save IDs

    createdAt: number;             // Unix timestamp (ms)
    updatedAt: number;             // Unix timestamp (ms)
}

/**
 * Default player data for new players
 */
export const DEFAULT_PLAYER_DATA: Omit<PlayerData, 'playerId' | 'name' | 'createdAt' | 'updatedAt'> = {
    gp: 100,
    maxGp: 100,
    quotas: {
        spawnPerDay: 50,
        placementsPerDay: 100,
    },
    rateLimiting: {
        lastSpawnTime: 0,
        lastPlacementTime: 0,
        spawnCountToday: 0,
        placementCountToday: 0,
    },
    pinList: [],
};

/**
 * Firestore document converter for PlayerData
 */
export const playerDataConverter = {
    toFirestore: (data: PlayerData) => data,
    fromFirestore: (snapshot: FirebaseFirestore.QueryDocumentSnapshot): PlayerData => {
        const data = snapshot.data();
        return data as PlayerData;
    },
};
