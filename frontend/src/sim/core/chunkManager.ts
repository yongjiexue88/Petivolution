
import {
    ChunkId,
    ChunkData,
    Vec2,
    WorldObject,
    SpeciesId,
} from '@shared/types';
import { V1 } from '@shared/constants';
import { SimulationState } from './tick';
import { v4 as uuid } from 'uuid';
import { OBJECT_CONFIGS } from '@shared/species.config';
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

        console.log(`🌍 Initializing World - Generating all 64 chunks upfront`);

        // Generate ALL chunks with their objects at world creation
        // This ensures all animals have access to resources regardless of camera position
        for (let cy = 0; cy < 8; cy++) {
            for (let cx = 0; cx < 8; cx++) {
                const id = this.getChunkId(cx, cy);
                if (!this.chunks.has(id)) {
                    this.generateChunk(id, sim);
                    const chunk = this.chunks.get(id)!;
                    this.generateObjects(chunk, sim);
                }
                // Mark all chunks as active so they all get updates
                this.activeChunks.add(id);
            }
        }

        // Spawn initial animals across the map
        this.spawnInitialAnimals(sim);

        this.initialized = true;
    }

    /**
     * DEBUG: Reset world logic
     */
    resetWorld(sim: SimulationState) {
        // 1. Clear all entities and objects
        sim.entities.clear();
        sim.objects.clear();
        sim.graveyard = []; // Clear graveyard on reset

        // 2. Clear all chunk data so they regenerate
        this.chunks.clear();
        this.activeChunks.clear();
        this.semiActiveChunks.clear();

        // 3. Regenerate ALL 64 chunks with objects
        for (let cy = 0; cy < 8; cy++) {
            for (let cx = 0; cx < 8; cx++) {
                const id = this.getChunkId(cx, cy);
                this.generateChunk(id, sim);
                const chunk = this.chunks.get(id)!;
                this.generateObjects(chunk, sim);
                // Mark all chunks as active
                this.activeChunks.add(id);
            }
        }

        // 4. Respawn initial animals
        this.spawnInitialAnimals(sim);

        console.log('🌍 World Reset Complete - All 64 chunks regenerated');
    }

    private spawnInitialAnimals(sim: SimulationState) {
        console.log('🌍 Spawning animals randomly across the map');

        const animalSpecies: SpeciesId[] = [
            'rat', 'cat', 'chicken', 'smallBird', 'raccoon', 'crow',
            'dog', 'fox', 'hawk', 'wolf', 'snake'
        ];

        for (const species of animalSpecies) {
            // Accessing dynamic property on V1.defaultSpawns
            const count = (V1.defaultSpawns as any)[species] || 0;

            for (let i = 0; i < count; i++) {
                // Random position across the entire map
                const tx = Math.floor(sim.rng() * V1.defaultMapWidth);
                const ty = Math.floor(sim.rng() * V1.defaultMapHeight);

                // Determine personality
                let personality: 'curious' | 'cautious' | 'brave' = 'curious';
                const pRoll = sim.rng();
                if (pRoll < 0.33) personality = 'cautious';
                else if (pRoll < 0.66) personality = 'brave';

                // Basic default personalities based on species type override
                if (['rat', 'chicken', 'smallBird'].includes(species)) {
                    personality = sim.rng() > 0.5 ? 'cautious' : 'curious';
                } else if (['cat', 'dog', 'wolf', 'hawk', 'fox'].includes(species)) {
                    personality = sim.rng() > 0.5 ? 'brave' : 'curious';
                }

                spawnEntity(sim, species, `${species}_${i}`, personality, {
                    tx: tx,
                    ty: ty
                });
            }
        }
    }

    private getRandomName(species: string, sim: SimulationState): string {
        const names: Record<string, string[]> = {
            cat: ['Tiger', 'Shadow', 'Luna', 'Simba', 'Oreo', 'Whiskers', 'Felix', 'Mittens'],
            rat: ['Squeaky', 'Pip', 'Cheese', 'Scurry', 'Nibbles', 'Dusty', 'Scout', 'Rustle'],
            chicken: ['Cluck', 'Peck', 'Feathers', 'Nugget', 'Eggbert', 'Henny'],
            smallBird: ['Tweety', 'Chirp', 'Sky', 'Blue', 'Robin', 'Pip'],
            raccoon: ['Bandit', 'Rocket', 'Sly', 'Meeko', 'Rascal', 'Swiper'],
            crow: ['Edgar', 'Poe', 'Odin', 'Raven', 'Shadow', 'Midnight'],
            dog: ['Buddy', 'Rex', 'Spot', 'Max', 'Bella', 'Charlie', 'Daisy'],
            fox: ['Foxy', 'Rusty', 'Vixey', 'Swift', 'Red', 'Tod'],
            hawk: ['Sky', 'Talon', 'Soar', 'Hunter', 'Swift', 'Eye'],
            wolf: ['Alpha', 'Fang', 'Luna', 'Ghost', 'Shadow', 'Winter'],
            snake: ['Sly', 'Hiss', 'Nagini', 'Ka', 'Fang', 'Coil'],
        };
        const nameList = names[species] || ['Unknown'];
        const name = nameList[Math.floor(sim.rng() * nameList.length)];
        return `${name}${Math.floor(sim.rng() * 99)}`;
    }

    /**
     * Update LOD based on camera position and zoom
     * SIMPLIFIED: Keep all chunks active at all times for a finite world
     */
    updateLOD(sim: SimulationState) {
        // For a finite 8x8 world, keep ALL chunks active
        // No virtualization - all animals remain in memory and fully simulated
        if (this.activeChunks.size < 64) {
            for (let cy = 0; cy < 8; cy++) {
                for (let cx = 0; cx < 8; cx++) {
                    const id = this.getChunkId(cx, cy);
                    if (!this.chunks.has(id)) {
                        this.generateChunk(id, sim);
                        const chunk = this.chunks.get(id)!;
                        this.generateObjects(chunk, sim);
                    }
                    this.activeChunks.add(id);
                }
            }
        }
        // No virtualization - entities persist across the entire map
    }

    /**
     * Far -> Active/Semi (Generate or Restore)
     */
    realizeChunk(id: ChunkId, sim: SimulationState) {
        if (this.activeChunks.has(id) || this.semiActiveChunks.has(id)) return;

        let chunk = this.chunks.get(id);

        if (!chunk) {
            this.generateChunk(id, sim);
            chunk = this.chunks.get(id)!;
            this.generateObjects(chunk, sim);

            // For infinite world generation, we might want to spawn some "wild" animals
            // based on the chunk's resource/danger levels.
            this.spawnWildAnimals(chunk, sim);
        } else {
            // Restore from stats (Ship of Theseus)
            this.restoreFromStats(chunk, sim);
        }
    }

    private spawnWildAnimals(chunk: ChunkData, sim: SimulationState) {
        const [cx, cy] = chunk.id.split(',').map(Number);
        const startTx = cx * CHUNK_SIZE_TILES;
        const startTy = cy * CHUNK_SIZE_TILES;

        // Resource-based spawns (Prey/Foragers)
        const resourceRoll = sim.rng();
        if (chunk.stats.resourceLevel > 0.3) {
            // Rats (Common)
            if (resourceRoll < 0.5) {
                this.spawnGroup(sim, 'rat', 1, 3, startTx, startTy, 'cautious');
            }
            // Chickens (Occasional)
            else if (resourceRoll < 0.7) {
                this.spawnGroup(sim, 'chicken', 1, 2, startTx, startTy, 'cautious');
            }
            // Small Birds (Common)
            else if (resourceRoll < 0.9) {
                this.spawnGroup(sim, 'smallBird', 2, 4, startTx, startTy, 'cautious');
            }
        }

        // Danger-based spawns (Predators)
        const dangerRoll = sim.rng();
        if (chunk.stats.dangerLevel > 0.4) {
            // Cats (Common)
            if (dangerRoll < 0.4) {
                this.spawnGroup(sim, 'cat', 1, 1, startTx, startTy, 'brave');
            }
            // Foxes (Uncommon)
            else if (dangerRoll < 0.6) {
                this.spawnGroup(sim, 'fox', 1, 1, startTx, startTy, 'brave');
            }
            // Dogs (Rare)
            else if (dangerRoll < 0.7) {
                this.spawnGroup(sim, 'dog', 1, 1, startTx, startTy, 'brave');
            }
            // Wolf/Hawk (Very Rare)
            else if (dangerRoll < 0.75) {
                const predator = sim.rng() > 0.5 ? 'wolf' : 'hawk';
                this.spawnGroup(sim, predator, 1, 1, startTx, startTy, 'brave');
            }
        }

        // Raccoons (Scavengers - Random)
        if (sim.rng() < 0.1) {
            this.spawnGroup(sim, 'raccoon', 1, 1, startTx, startTy, 'curious');
        }
    }

    private spawnGroup(sim: SimulationState, species: SpeciesId, min: number, max: number, startTx: number, startTy: number, personality: 'brave' | 'cautious' | 'curious') {
        const count = min + Math.floor(sim.rng() * (max - min + 1));
        for (let i = 0; i < count; i++) {
            spawnEntity(sim, species, this.getRandomName(species, sim), personality, {
                tx: startTx + sim.rng() * CHUNK_SIZE_TILES,
                ty: startTy + sim.rng() * CHUNK_SIZE_TILES
            });
        }
    }

    private restoreFromStats(chunk: ChunkData, sim: SimulationState) {
        const [cx, cy] = chunk.id.split(',').map(Number);
        const counts = chunk.stats.counts || {};

        // Simple statistical restoration
        for (const speciesKey in counts) {
            const species = speciesKey as SpeciesId;
            const count = counts[species] || 0;

            for (let i = 0; i < count; i++) {
                // Determine personality based on species (simple heuristic or random)
                let personality: 'brave' | 'cautious' | 'curious' = 'curious';
                if (['rat', 'chicken', 'smallBird'].includes(species)) personality = 'cautious';
                if (['cat', 'dog', 'wolf', 'hawk', 'fox'].includes(species)) personality = 'brave';

                spawnEntity(sim, species, this.getRandomName(species, sim), personality, {
                    tx: cx * CHUNK_SIZE_TILES + sim.rng() * CHUNK_SIZE_TILES,
                    ty: cy * CHUNK_SIZE_TILES + sim.rng() * CHUNK_SIZE_TILES
                });
            }
        }

        chunk.stats.counts = {};
    }

    /**
     * Active/Semi -> Far (Virtualize)
     */
    virtualizeChunk(id: ChunkId, sim: SimulationState) {
        const chunk = this.chunks.get(id);
        if (!chunk) return;

        const [cx, cy] = id.split(',').map(Number);
        const toRemove: string[] = [];
        const counts: Partial<Record<SpeciesId, number>> = {};

        for (const entity of sim.entities.values()) {
            const coords = this.getChunkCoords(entity.pos);
            if (coords.x === cx && coords.y === cy) {
                const s = entity.species;
                counts[s] = (counts[s] || 0) + 1;
                toRemove.push(entity.id);
            }
        }

        chunk.stats.counts = counts;
        chunk.stats.lastTick = sim.tick;

        for (const sid of toRemove) {
            sim.entities.delete(sid);
        }
    }

    /**
     * Zone types for resource distribution
     * Based on 8x8 chunk grid (256 tiles / 32 tiles per chunk = 8 chunks)
     */
    private getZoneForChunk(cx: number, cy: number): 'wild' | 'brush' | 'forestEdge' | 'grove' | 'urbanFringe' | 'urban' | 'pond' {
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

            case 'brush': { // Ring / Corners
                // Second ring - 1 water at corners, 2 bushes (reduced from 4 to create open space)
                const isCorner = (cx === 1 || cx === 6) && (cy === 1 || cy === 6);
                if (isCorner) {
                    this.spawnObject(sim, 'water', startTx, startTy);
                }
                for (let i = 0; i < 2; i++) {
                    this.spawnObject(sim, 'bush', startTx, startTy);
                }
                break;
            }

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
            obj.data!.strength01 = OBJECT_CONFIGS.bush.strengthDefault || 1;
        } else if (type === 'perch') {
            obj.data!.strength01 = OBJECT_CONFIGS.perch.strengthDefault || 1;
        }

        sim.objects.set(obj.id, obj);
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
                ratCount: 0,
                catCount: 0,
                counts: {}, // Handled by initial spawn or virtualization
                resourceLevel,
                dangerLevel,
                lastTick: sim.tick
            }
        };
        this.chunks.set(id, chunk);
    }
}
