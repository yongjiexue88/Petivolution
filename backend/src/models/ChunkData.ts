/**
 * Chunk Data Model
 * 
 * Stored in Firestore collection: chunks/{chunkId}
 * Document ID format: "{cx}_{cy}" (e.g., "0_0", "-1_2")
 * 
 * IMPORTANT: Firestore documents have a 1 MiB size limit.
 * Keep the objects array limited to ~100-200 items to stay under the limit.
 */

export interface ChunkStatistics {
    ratCount: number;
    catCount: number;
    resourceIndex: number;  // 0-1 normalized (availability of water/food/shelter)
    riskIndex: number;      // 0-1 normalized (danger level, predator density)
}

export interface StaticObject {
    id: string;
    type: 'water' | 'bush' | 'trash';
    tx: number;  // Tile X coordinate (relative to chunk)
    ty: number;  // Tile Y coordinate (relative to chunk)
}

export interface ChunkData {
    chunkId: string;        // "{cx}_{cy}"
    cx: number;             // Chunk X coordinate
    cy: number;             // Chunk Y coordinate

    stats: ChunkStatistics;
    objects: StaticObject[];  // Limited to ~100-200 objects to stay under 1 MiB

    updatedAt: number;      // Unix timestamp (ms)
}

/**
 * Maximum number of objects per chunk to stay under 1 MiB limit
 * Assuming ~500 bytes per object (with overhead), 200 objects ≈ 100 KB
 */
export const MAX_OBJECTS_PER_CHUNK = 200;

/**
 * Default chunk statistics
 */
export const DEFAULT_CHUNK_STATS: ChunkStatistics = {
    ratCount: 0,
    catCount: 0,
    resourceIndex: 0.5,
    riskIndex: 0.5,
};

/**
 * Create a new chunk data object
 */
export function createChunkData(cx: number, cy: number): ChunkData {
    return {
        chunkId: `${cx}_${cy}`,
        cx,
        cy,
        stats: { ...DEFAULT_CHUNK_STATS },
        objects: [],
        updatedAt: Date.now(),
    };
}

/**
 * Parse chunk coordinates from chunk ID
 */
export function parseChunkId(chunkId: string): { cx: number; cy: number } | null {
    const parts = chunkId.split('_');
    if (parts.length !== 2) return null;

    const cx = parseInt(parts[0], 10);
    const cy = parseInt(parts[1], 10);

    if (isNaN(cx) || isNaN(cy)) return null;

    return { cx, cy };
}

/**
 * Firestore document converter for ChunkData
 */
export const chunkDataConverter = {
    toFirestore: (data: ChunkData) => data,
    fromFirestore: (snapshot: FirebaseFirestore.QueryDocumentSnapshot): ChunkData => {
        const data = snapshot.data();
        return data as ChunkData;
    },
};
