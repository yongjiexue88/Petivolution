
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
 * Simplified for 512×512 map (16×16 = 256 chunks total).
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
    initializeWorld(sim: SimulationState) {
        if (this.initialized) return;

        console.log(`🌍 Initializing Infinite World`);

        // Spawn initial animals in center area
        this.spawnInitialAnimals(sim);

        this.initialized = true;
    }

    /**
     * Spawn initial animals in the center of the map
     */
    private spawnInitialAnimals(sim: SimulationState) {
        const centerX = V1.defaultMapWidth / 2;
        const centerY = V1.defaultMapHeight / 2;
        const spawnRadius = 30; // Spawn within 30 tiles of center

        // Generic Spawner for all animals in config
        const animals = ['rat', 'cat', 'chicken', 'smallBird', 'raccoon', 'crow', 'dog', 'fox', 'hawk', 'wolf', 'snake'] as const;

        animals.forEach(species => {
            const count = (V1.defaultSpawns as any)[species] || 0;
            for (let i = 0; i < count; i++) {
                const offsetX = (sim.rng() - 0.5) * spawnRadius * 2;
                const offsetY = (sim.rng() - 0.5) * spawnRadius * 2;

                // Assign personality based on species role? Defaulting for now.
                let personality: 'brave' | 'cautious' | 'curious' = 'curious';
                if (['rat', 'chicken', 'smallBird'].includes(species)) personality = 'cautious';
                if (['cat', 'dog', 'wolf', 'hawk', 'fox'].includes(species)) personality = 'brave';

                spawnEntity(sim, species, this.getRandomName(species, sim), personality, {
                    tx: centerX + offsetX,
                    ty: centerY + offsetY,
                });
            }
        });

        console.log(`🌍 Spawned initial animals based on config`);
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

        // Spawn Rats based on resource level
        const ratTarget = Math.floor(chunk.stats.resourceLevel * 3);
        for (let i = 0; i < ratTarget; i++) {
            if (sim.rng() > 0.7) {
                spawnEntity(sim, 'rat', this.getRandomName('rat', sim), 'cautious', {
                    tx: startTx + sim.rng() * CHUNK_SIZE_TILES,
                    ty: startTy + sim.rng() * CHUNK_SIZE_TILES
                });
            }
        }

        // Spawn Cats based on danger level
        const catTarget = Math.floor(chunk.stats.dangerLevel * 1);
        for (let i = 0; i < catTarget; i++) {
            if (sim.rng() > 0.9) {
                spawnEntity(sim, 'cat', this.getRandomName('cat', sim), 'brave', {
                    tx: startTx + sim.rng() * CHUNK_SIZE_TILES,
                    ty: startTy + sim.rng() * CHUNK_SIZE_TILES
                });
            }
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
     * Generate objects for a chunk (water, bush, trash)
     */
    generateObjects(chunk: ChunkData, sim: SimulationState) {
        const [cx, cy] = chunk.id.split(',').map(Number);
        const startTx = cx * CHUNK_SIZE_TILES;
        const startTy = cy * CHUNK_SIZE_TILES;

        // For infinite world, we define a "prime center" for initial resources.
        // Current center is based on (256, 256) tiles.
        const centerChunkX = Math.floor((V1.defaultMapWidth / 2) / CHUNK_SIZE_TILES);
        const centerChunkY = Math.floor((V1.defaultMapHeight / 2) / CHUNK_SIZE_TILES);

        const distFromCenter = Math.max(
            Math.abs(cx - centerChunkX),
            Math.abs(cy - centerChunkY)
        );

        // Core zone: center 4 chunks
        if (distFromCenter <= 2) {
            // Water source in very center
            if (cx === centerChunkX && cy === centerChunkY) {
                this.spawnObject(sim, 'water', startTx, startTy);
            }

            // Trash near center
            if (distFromCenter <= 1 && sim.rng() > 0.5) {
                this.spawnObject(sim, 'trash', startTx, startTy);
            }

            // Bushes in core zone
            const bushCount = 2 + Math.floor(sim.rng() * 3);
            for (let i = 0; i < bushCount; i++) {
                this.spawnObject(sim, 'bush', startTx, startTy);
            }
        }
        // Buffer zone: some scattered bushes
        else if (distFromCenter <= 4) {
            if (sim.rng() > 0.6) {
                this.spawnObject(sim, 'bush', startTx, startTy);
            }
        }
        // Outer zone: sparse
    }

    spawnObject(sim: SimulationState, type: 'water' | 'bush' | 'trash', startTx: number, startTy: number) {
        const offsetX = Math.floor(Math.random() * CHUNK_SIZE_TILES);
        const offsetY = Math.floor(Math.random() * CHUNK_SIZE_TILES);
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
        } else if (type === 'trash') {
            obj.data!.resources = OBJECT_CONFIGS.trash.maxResources;
            obj.data!.maxResources = OBJECT_CONFIGS.trash.maxResources;
            obj.data!.regenRate = OBJECT_CONFIGS.trash.regenRatePerTick;
        } else if (type === 'bush') {
            obj.data!.strength01 = OBJECT_CONFIGS.bush.strengthDefault || 1;
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
                counts: {}, // Handled by initial spawn or virtualization
                resourceLevel,
                dangerLevel,
                lastTick: sim.tick
            }
        };
        this.chunks.set(id, chunk);
    }
}
