
import {
    ChunkId,
    ChunkData,
    Vec2,
    WorldObject,
    SpeciesId,
    EntityRuntime,
} from '@shared/types';
import { V1 } from '@shared/constants';
import { SimulationState } from './tick';
import { v4 as uuid } from 'uuid';
import { OBJECT_CONFIGS, getSpeciesConfig } from '@shared/species.config';
import { createNoise2D } from 'simplex-noise';
import { spawnEntity } from './spawner';

// Configuration
const CHUNK_SIZE_TILES = V1.chunkSize;
const CHUNK_SIZE_PX = V1.chunkSize * V1.tileSizePx;

/**
 * ChunkManager for V1 Fishbowl (Finite World)
 * 
 * Simplified for 256x256 map (8x8 = 64 chunks total).
 * No virtualization needed - all chunks stay in memory.
 * Main purpose: Organize object generation by region.
 */
export class ChunkManager {
    chunks: Map<ChunkId, ChunkData> = new Map();
    activeChunks: Set<ChunkId> = new Set();
    semiActiveChunks: Set<ChunkId> = new Set();
    noise2D = createNoise2D();
    initialized = false;

    // Helper: World Pos -> Chunk Coords
    getChunkCoords(pos: Vec2): { x: number, y: number } {
        return {
            x: Math.floor(pos.x / CHUNK_SIZE_PX),
            y: Math.floor(pos.y / CHUNK_SIZE_PX)
        };
    }

    getChunkId(x: number, y: number): ChunkId {
        return `${x},${y}`;
    }

    /**
     * Initialize all chunks for the finite world
     * Called once on world creation
     */
    initializeWorld(sim: SimulationState, force = false) {
        if (this.initialized && !force) return;

        const chunksX = Math.ceil(V1.defaultMapWidth / CHUNK_SIZE_TILES);
        const chunksY = Math.ceil(V1.defaultMapHeight / CHUNK_SIZE_TILES);

        console.log(`🌍 Initializing ${chunksX}×${chunksY} = ${chunksX * chunksY} chunks`);

        // Generate all chunks
        for (let y = 0; y < chunksY; y++) {
            for (let x = 0; x < chunksX; x++) {
                const id = this.getChunkId(x, y);
                this.generateChunk(id, sim);
                this.activeChunks.add(id);
            }
        }

        // Spawn objects in all chunks
        for (const chunk of this.chunks.values()) {
            this.generateObjects(chunk, sim);
        }

        // Spawn initial animals in center area
        this.spawnInitialAnimals(sim);

        this.initialized = true;
    }

    /**
     * Update LOD based on camera position
     * For finite world, this is mostly a no-op since all chunks are active
     * Kept for compatibility
     */
    updateLOD(_sim: SimulationState) {
        // For finite world, all chunks are always active
        // No virtualization needed
    }

    /**
     * Zone types for resource distribution
     * Based on 8x8 chunk grid (256 tiles / 32 tiles per chunk = 8 chunks)
     */
    public getZoneForChunk(cx: number, cy: number): 'wild' | 'brush' | 'forestEdge' | 'grove' | 'urbanFringe' | 'urban' | 'pond' {
        // Wild: outer edges
        if (cx === 0 || cy === 0 || cx === 7 || cy === 7) {
            return 'wild';
        }
        // Brush: second ring (corners and some edges)
        if ((cx === 1 || cx === 6) && (cy === 1 || cy === 6)) {
            return 'brush';
        }
        // Forest Edge: rows 1 and 6 (excluding corners)
        if ((cy === 1 || cy === 6) && cx > 1 && cx < 6) {
            return 'forestEdge';
        }
        if ((cx === 1 || cx === 6) && cy > 1 && cy < 6) {
            return 'forestEdge';
        }
        // Grove: chunks (2,3) and (2,4)
        if (cx === 2 && (cy === 3 || cy === 4)) {
            return 'grove';
        }
        // Pond: chunk (3,3) - primary water source
        if (cx === 3 && cy === 3) {
            return 'pond';
        }
        // Urban: chunk (4,4) - trash/activity hub
        if (cx === 4 && cy === 4) {
            return 'urban';
        }
        // Urban Fringe: (3,4) and (4,3)
        if ((cx === 3 && cy === 4) || (cx === 4 && cy === 3)) {
            return 'urbanFringe';
        }
        // Default to brush for remaining inner chunks
        return 'brush';
    }

    /**
     * Generate objects for a chunk based on zone type
     */
    generateObjects(chunk: ChunkData, sim: SimulationState) {
        const [cx, cy] = chunk.id.split(',').map(Number);
        const startTx = cx * CHUNK_SIZE_TILES;
        const startTy = cy * CHUNK_SIZE_TILES;
        const zone = this.getZoneForChunk(cx, cy);

        // Refined Density to avoid "food everywhere" and encourage movement
        switch (zone) {
            case 'pond': // (3,3)
                // Primary water source - 2 water pools
                for (let i = 0; i < 2; i++) {
                    this.spawnObject(sim, 'water', startTx, startTy);
                }
                break;

            case 'urban': // (4,4)
                // Trash and activity hub - 2 trash, 1 bush (reduced bush to kept urban feel)
                for (let i = 0; i < 2; i++) {
                    this.spawnObject(sim, 'trash', startTx, startTy);
                }
                this.spawnObject(sim, 'bush', startTx, startTy);
                break;

            case 'urbanFringe': // (3,4), (4,3)
                // Urban spillover - 1 trash each
                this.spawnObject(sim, 'trash', startTx, startTy);
                this.spawnObject(sim, 'bush', startTx, startTy);
                break;

            case 'grove': // (2,3), (2,4)
                // Dense vegetation - 4 bushes (reduced from 6), 2 perches (reduced from 4)
                for (let i = 0; i < 4; i++) {
                    this.spawnObject(sim, 'bush', startTx, startTy);
                }
                for (let i = 0; i < 2; i++) {
                    this.spawnObject(sim, 'perch', startTx, startTy);
                }
                break;

            case 'forestEdge': // Rows 1,6
                // Transition zone - 3 bushes (reduced from 4), 2 perches (reduced from 4)
                for (let i = 0; i < 3; i++) {
                    this.spawnObject(sim, 'bush', startTx, startTy);
                }
                for (let i = 0; i < 2; i++) {
                    this.spawnObject(sim, 'perch', startTx, startTy);
                }
                break;

            case 'brush': // Ring / Corners
                // Second ring - 1 water at corners, 2 bushes (reduced from 4 to create open space)
                const isCorner = (cx === 1 || cx === 6) && (cy === 1 || cy === 6);
                if (isCorner) {
                    this.spawnObject(sim, 'water', startTx, startTy);
                }
                for (let i = 0; i < 2; i++) {
                    this.spawnObject(sim, 'bush', startTx, startTy);
                }
                break;

            case 'wild': // Outer
                // Sparse - only occasional bushes (30% chance)
                if (sim.rng() > 0.7) {
                    this.spawnObject(sim, 'bush', startTx, startTy);
                }
                break;
        }
    }

    spawnObject(sim: SimulationState, type: 'water' | 'bush' | 'trash' | 'perch', startTx: number, startTy: number) {
        const offsetX = Math.floor(sim.rng() * CHUNK_SIZE_TILES);
        const offsetY = Math.floor(sim.rng() * CHUNK_SIZE_TILES);
        const tx = startTx + offsetX;
        const ty = startTy + offsetY;

        const obj: WorldObject = {
            id: uuid(),
            type,
            pos: { tx, ty },
            data: {}
        };

        if (type === 'water') {
            obj.data!.resources = OBJECT_CONFIGS.water.maxResources;
            obj.data!.maxResources = OBJECT_CONFIGS.water.maxResources;
            obj.data!.regenRate = OBJECT_CONFIGS.water.regenRatePerTick;
            obj.data!.indestructible = OBJECT_CONFIGS.water.indestructible;
        } else if (type === 'trash') {
            obj.data!.resources = OBJECT_CONFIGS.trash.maxResources;
            obj.data!.maxResources = OBJECT_CONFIGS.trash.maxResources;
            obj.data!.regenRate = OBJECT_CONFIGS.trash.regenRatePerTick;
            obj.data!.indestructible = OBJECT_CONFIGS.trash.indestructible;
        } else if (type === 'bush') {
            obj.data!.strength01 = OBJECT_CONFIGS.bush.strengthDefault;
        } else if (type === 'perch') {
            obj.data!.strength01 = OBJECT_CONFIGS.perch.strengthDefault;
        }

        sim.objects.set(obj.id, obj);
    }

    spawnInitialAnimals(sim: SimulationState) {
        // Decentralized Spawning: Place animals in their relevant zones
        // Pond (3,3) - Water Hub
        // Urban (4,4) - Trash Hub
        // Forest/Grove (2,3; 2,4 etc) - Trees

        const mapW = V1.defaultMapWidth;
        const mapH = V1.defaultMapHeight;
        const chunkSize = CHUNK_SIZE_TILES; // 32

        // Helper to get random tile in a specific chunk
        const getPosInChunk = (cx: number, cy: number) => {
            return {
                x: cx * chunkSize + Math.floor(sim.rng() * chunkSize),
                y: cy * chunkSize + Math.floor(sim.rng() * chunkSize)
            };
        };

        // 1. Urban Dwellers (Rat, Raccoon, Crow) -> Spawn near Urban (4,4)
        // 2. Water Dependent / Predators (Cat, Dog, Fox) -> Spawn near Pond (3,3)
        // 3. Birds / Forest Dwellers (smallBird, Hawk, Chicken, Snake) -> Spawn in Grove (2,3) or Forest Edge
        // 4. Pack / Wild (Wolf) -> Spawn in Wild/Brush (1,1)

        const spawnList: { species: SpeciesId, count: number, zoneCx: number, zoneCy: number }[] = [
            // Urban
            { species: 'rat', count: V1.defaultSpawns.rat, zoneCx: 4, zoneCy: 4 },
            { species: 'raccoon', count: V1.defaultSpawns.raccoon, zoneCx: 4, zoneCy: 4 },
            { species: 'crow', count: V1.defaultSpawns.crow, zoneCx: 3, zoneCy: 4 }, // Fringe

            // Pond / Central
            { species: 'cat', count: V1.defaultSpawns.cat, zoneCx: 3, zoneCy: 3 },
            { species: 'dog', count: V1.defaultSpawns.dog, zoneCx: 3, zoneCy: 3 },
            { species: 'fox', count: V1.defaultSpawns.fox, zoneCx: 3, zoneCy: 3 },

            // Grove / Forest
            { species: 'smallBird', count: V1.defaultSpawns.smallBird, zoneCx: 2, zoneCy: 3 },
            { species: 'chicken', count: V1.defaultSpawns.chicken, zoneCx: 2, zoneCy: 4 },
            { species: 'hawk', count: V1.defaultSpawns.hawk, zoneCx: 2, zoneCy: 3 },
            { species: 'snake', count: V1.defaultSpawns.snake, zoneCx: 6, zoneCy: 2 }, // East Forest

            // Wild / Brush
            { species: 'wolf', count: V1.defaultSpawns.wolf, zoneCx: 1, zoneCy: 1 },
        ];

        for (const entry of spawnList) {
            for (let i = 0; i < entry.count; i++) {
                const pos = getPosInChunk(entry.zoneCx, entry.zoneCy);
                const speciesConfig = getSpeciesConfig(entry.species);

                // Determine personality
                let personality: 'curious' | 'cautious' | 'brave' = 'curious';
                const pRoll = sim.rng();
                if (pRoll < 0.33) personality = 'cautious';
                else if (pRoll < 0.66) personality = 'brave';

                // Basic default personalities based on species type
                if (['rat', 'chicken', 'smallBird'].includes(entry.species)) {
                    personality = sim.rng() > 0.5 ? 'cautious' : 'curious';
                } else if (['cat', 'dog', 'wolf', 'hawk', 'fox'].includes(entry.species)) {
                    personality = sim.rng() > 0.5 ? 'brave' : 'curious';
                }

                const entity: EntityRuntime = {
                    id: uuid(),
                    species: entry.species,
                    name: `${entry.species}_${i}`,
                    personality,
                    pos: { x: pos.x, y: pos.y },
                    vel: { x: 0, y: 0 },
                    facing: 's',
                    vitals: {
                        hunger01: 0.8 + sim.rng() * 0.2,
                        thirst01: 0.8 + sim.rng() * 0.2,
                        fatigue01: 1.0,
                        health01: 1.0
                    },
                    ageTicks: 0,
                    state: 'idle',
                    ai: {
                        lastPerceptionTick: 0,
                        lastDecisionTick: 0,
                        currentGoal: 'wander',
                        lastUtilityScores: {},
                        recentStimuli: []
                    },
                    parents: [],
                    children: [],
                    generation: 1,
                    history: [],
                    path: []
                };

                sim.entities.set(entity.id, entity);
            }
        }
    }

    generateChunk(id: ChunkId, sim: SimulationState) {
        const [x, y] = id.split(',').map(Number);

        // Noise for Biomes (used for visual variation later)
        const resourceNoise = this.noise2D(x * 0.1, y * 0.1);
        const dangerNoise = this.noise2D(x * 0.1 + 100, y * 0.1 + 100);

        const resourceLevel = (resourceNoise + 1) / 2; // 0..1
        const dangerLevel = (dangerNoise + 1) / 2;

        const chunk: ChunkData = {
            id,
            x,
            y,
            stats: {
                ratCount: 0, // Handled by initial spawn, not per-chunk
                catCount: 0,
                resourceLevel,
                dangerLevel,
                lastTick: sim.tick
            }
        };
        this.chunks.set(id, chunk);
    }
}
