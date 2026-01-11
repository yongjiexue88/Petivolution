
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

        console.log(`🌍 Initializing Infinite World`);

        // Spawn initial animals in center area
        this.spawnInitialAnimals(sim);

        this.initialized = true;
    }

    /**
     * DEBUG: Reset world logic
     */
    resetWorld(sim: SimulationState) {
        // 1. Clear all entities
        sim.entities.clear();
        sim.objects.clear();

        // 2. Clear all chunk stats (so they regenerate)
        for (const chunk of this.chunks.values()) {
            chunk.stats.counts = {};
        }

        // 3. Reset stats
        this.activeChunks.clear();
        this.semiActiveChunks.clear();

        // 4. Respawn initial
        this.spawnInitialAnimals(sim);

        // 5. Force update LOD (will cause realizeChunk -> spawnWildAnimals)
        this.updateLOD(sim);

        console.log('🌍 World Reset Complete');
    }

    private spawnInitialAnimals(sim: SimulationState) {
        // Decentralized Spawning: Place animals in their relevant zones
        // Pond (3,3) - Water Hub
        // Urban (4,4) - Trash Hub
        // Forest/Grove (2,3; 2,4 etc) - Trees

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

                spawnEntity(sim, entry.species, `${entry.species}_${i}`, personality, {
                    tx: pos.x / V1.tileSizePx, // spawnEntity takes tiles, getPosInChunk returns tiles*tileSize? Wait.
                    ty: pos.y / V1.tileSizePx
                });
            }
        }

        console.log(`🌍 Spawned decentralized initial animals`);
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
     * Dynamically realize chunks as they come into view
     */
    /**
     * Update LOD based on ViewRect (Hot/Warm/Cold)
     */
    updateLOD(sim: SimulationState) {
        if (!sim.viewRectTiles) {
            // Fallback if viewRect not set (e.g. init)
            return;
        }

        const view = sim.viewRectTiles;
        const C_TILES = CHUNK_SIZE_TILES;

        // Calculate Chunk Rect visible
        const minCx = Math.floor(view.leftTx / C_TILES);
        const minCy = Math.floor(view.topTy / C_TILES);
        const maxCx = Math.floor(view.rightTx / C_TILES);
        const maxCy = Math.floor(view.bottomTy / C_TILES);



        const newActive = new Set<ChunkId>();
        const newSemi = new Set<ChunkId>();

        // Hot Padding = 1 (Chunks strictly needed + 1 ring)
        const hotPadding = 1;
        // Warm Padding = 2 (Chunks preloaded)
        const warmPadding = 2;

        for (let cy = minCy - warmPadding; cy <= maxCy + warmPadding; cy++) {
            for (let cx = minCx - warmPadding; cx <= maxCx + warmPadding; cx++) {
                // Bounds check
                if (cx < 0 || cy < 0 || cx >= 8 || cy >= 8) continue; // 256/32 = 8x8 grid

                const id = this.getChunkId(cx, cy);

                // Is Hot?
                if (cx >= minCx - hotPadding && cx <= maxCx + hotPadding &&
                    cy >= minCy - hotPadding && cy <= maxCy + hotPadding) {
                    newActive.add(id);
                } else {
                    newSemi.add(id);
                }
            }
        }

        // Handle State Transitions
        // 1. Virtualize chunks that are no longer in semi-active radius
        const currentAll = new Set([...this.activeChunks, ...this.semiActiveChunks]);
        for (const id of currentAll) {
            if (!newActive.has(id) && !newSemi.has(id)) {
                this.virtualizeChunk(id, sim);
            }
        }

        // 2. Realize new active/semi chunks
        for (const id of newActive) {
            if (!this.activeChunks.has(id)) {
                this.realizeChunk(id, sim);
            }
        }
        for (const id of newSemi) {
            if (!this.semiActiveChunks.has(id) && !this.activeChunks.has(id)) {
                this.realizeChunk(id, sim);
            }
        }

        this.activeChunks = newActive;
        this.semiActiveChunks = newSemi;
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
