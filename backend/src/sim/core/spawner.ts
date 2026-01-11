import {
    EntityRuntime,
    SpeciesId,
    Personality,
    TilePos,
    Vec2,
} from '@shared/types';
import { V1 } from '@shared/constants';
import { v4 as uuid } from 'uuid';
import { SimulationState } from './tick';

export type SpawnReason = 'migration' | 'reproduction' | 'ring_fallback' | 'near_resource' | 'initial';

export interface SpawnOptions {
    spawnReason?: SpawnReason;
    spawnDirection?: Vec2; // Initial velocity toward a target (normalized direction)
}

export function spawnEntity(
    sim: SimulationState,
    species: SpeciesId,
    name: string,
    personality: Personality,
    pos: TilePos,
    options?: SpawnOptions
): EntityRuntime | null {
    // 检查人口上限 (per-chunk density)
    if (!canSpawn(species, sim, pos)) {
        return null;
    }

    const entity: EntityRuntime = {
        id: uuid(),
        species,
        name,
        personality,
        pos: { x: pos.tx * V1.tileSizePx, y: pos.ty * V1.tileSizePx },
        vel: { x: 0, y: 0 },
        facing: 's',
        vitals: {
            hunger01: 0.8 + sim.rng() * 0.2,
            thirst01: 0.8 + sim.rng() * 0.2,
            fatigue01: 0.7 + sim.rng() * 0.3,
            health01: 1.0,
        },
        ageTicks: 0,
        state: 'idle',
        ai: {
            lastPerceptionTick: 0,
            lastDecisionTick: 0,
            currentGoal: 'wander',
            lastUtilityScores: {},
            recentStimuli: [],
        },
        parents: [], // V2
        children: [], // V2
        generation: 1, // V2 Default
        history: [], // V1.1
        path: [],    // V1.1
        // P0: Migration feel
        spawnReason: options?.spawnReason,
        spawnDirection: options?.spawnDirection,
    };

    // If spawn direction is set, give initial velocity in that direction
    if (options?.spawnDirection) {
        const speed = 0.5; // Initial speed toward target
        entity.vel.x = options.spawnDirection.x * speed;
        entity.vel.y = options.spawnDirection.y * speed;
    }

    sim.entities.set(entity.id, entity);
    sim.stats.birthsThisMinute++;

    return entity;
}

/**
 * Check if spawning is allowed using per-chunk density caps.
 * In an infinite world, we limit density per chunk, not globally.
 */
export function canSpawn(species: SpeciesId, sim: SimulationState, pos?: TilePos): boolean {
    if (!sim.rules.capsEnabled) return true;

    // V3: Use per-chunk caps for infinite world
    const capPerChunk = V1.capPerChunk[species];

    // If no position specified, check if ANY active chunk has room
    // (used for UI display "can add more?")
    if (!pos) {
        // For manual spawn from UI, just check total active entities isn't excessive
        // This is a soft limit to prevent performance issues
        const maxActiveEntities = sim.chunkManager.activeChunks.size * capPerChunk;
        let count = 0;
        for (const entity of sim.entities.values()) {
            if (entity.species === species && entity.state !== 'dead') {
                count++;
            }
        }
        return count < maxActiveEntities;
    }

    // Calculate chunk for the target position
    const chunkX = Math.floor(pos.tx / V1.chunkSize);
    const chunkY = Math.floor(pos.ty / V1.chunkSize);

    // Count entities in this specific chunk
    let chunkCount = 0;
    for (const entity of sim.entities.values()) {
        if (entity.species === species && entity.state !== 'dead') {
            const entityChunkX = Math.floor(entity.pos.x / V1.tileSizePx / V1.chunkSize);
            const entityChunkY = Math.floor(entity.pos.y / V1.tileSizePx / V1.chunkSize);
            if (entityChunkX === chunkX && entityChunkY === chunkY) {
                chunkCount++;
            }
        }
    }

    return chunkCount < capPerChunk;
}
