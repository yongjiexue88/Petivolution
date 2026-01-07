/**
 * World Metadata Model
 * 
 * Stored in Firestore document: worlds/main
 * 
 * Lightweight world metadata and configuration.
 * Full world state (entities, objects) should be stored separately
 * (e.g., in Cloud Storage) and referenced by latestSnapshotPath.
 */

export interface WorldMetadata {
    seed: number;                  // World seed for terrain generation
    tick: number;                  // Current simulation tick
    rulesVersion: string;          // Version of game rules (for compatibility)
    latestSnapshotPath: string;    // Path to latest full save (e.g., gs://bucket/saves/world-123.json)

    createdAt: number;             // Unix timestamp (ms)
    updatedAt: number;             // Unix timestamp (ms)
}

/**
 * Default world metadata
 */
export const DEFAULT_WORLD_METADATA: Omit<WorldMetadata, 'createdAt' | 'updatedAt'> = {
    seed: Math.floor(Math.random() * 1000000),
    tick: 0,
    rulesVersion: 'v1.0',
    latestSnapshotPath: '',
};

/**
 * Firestore document converter for WorldMetadata
 */
export const worldMetadataConverter = {
    toFirestore: (data: WorldMetadata) => data,
    fromFirestore: (snapshot: FirebaseFirestore.QueryDocumentSnapshot): WorldMetadata => {
        const data = snapshot.data();
        return data as WorldMetadata;
    },
};
