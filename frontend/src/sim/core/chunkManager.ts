
import {
    ChunkId,
    ChunkData,
    Vec2,
    WorldObject,
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

        // Spawn rats
        for (let i = 0; i < V1.defaultSpawns.rat; i++) {
            const offsetX = (sim.rng() - 0.5) * spawnRadius * 2;
            const offsetY = (sim.rng() - 0.5) * spawnRadius * 2;
            spawnEntity(sim, 'rat', this.getRandomName('rat', sim), 'cautious', {
                tx: centerX + offsetX,
                ty: centerY + offsetY,
            });
        }

        // Spawn cats
        for (let i = 0; i < V1.defaultSpawns.cat; i++) {
            const offsetX = (sim.rng() - 0.5) * spawnRadius * 2;
            const offsetY = (sim.rng() - 0.5) * spawnRadius * 2;
            spawnEntity(sim, 'cat', this.getRandomName('cat', sim), 'brave', {
                tx: centerX + offsetX,
                ty: centerY + offsetY,
            });
        }

        console.log(`🐭 Spawned ${V1.defaultSpawns.rat} rats and 🐱 ${V1.defaultSpawns.cat} cats`);
    }

    private getRandomName(species: 'rat' | 'cat', sim: SimulationState): string {
        const names = {
            cat: ['Tiger', 'Shadow', 'Luna', 'Simba', 'Oreo', 'Whiskers', 'Felix', 'Mittens'],
            rat: ['Squeaky', 'Pip', 'Cheese', 'Scurry', 'Nibbles', 'Dusty', 'Scout', 'Rustle'],
        };
        const nameList = names[species];
        const name = nameList[Math.floor(sim.rng() * nameList.length)];
        return `${name}${Math.floor(sim.rng() * 99)}`;
    }

    /**
     * Update LOD based on camera position and zoom
     * Dynamically realize chunks as they come into view
     */
    updateLOD(sim: SimulationState) {
        // Camera center in world pixels
        const camX = sim.cameraCenter.x;
        const camY = sim.cameraCenter.y;
        const zoom = sim.cameraZoom || 1;

        const centerChunk = this.getChunkCoords({ x: camX, y: camY });

        // Base radius is 1 chunk around center
        // At zoom=1, we see roughly a few chunks.
        // At zoom=0.2 (zoomed out), we see 5x more area.
        // Radius increases as zoom decreases.
        const dynamicRadius = Math.ceil(2 / zoom);
        const semiRadius = dynamicRadius + 1;

        const newActive = new Set<ChunkId>();
        const newSemi = new Set<ChunkId>();

        // Identify new zones
        for (let y = centerChunk.y - semiRadius; y <= centerChunk.y + semiRadius; y++) {
            for (let x = centerChunk.x - semiRadius; x <= centerChunk.x + semiRadius; x++) {
                const id = this.getChunkId(x, y);
                const dist = Math.max(Math.abs(x - centerChunk.x), Math.abs(y - centerChunk.y));

                if (dist <= dynamicRadius) {
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

        // Simple statistical restoration
        for (let i = 0; i < chunk.stats.ratCount; i++) {
            spawnEntity(sim, 'rat', this.getRandomName('rat', sim), 'cautious', {
                tx: cx * CHUNK_SIZE_TILES + sim.rng() * CHUNK_SIZE_TILES,
                ty: cy * CHUNK_SIZE_TILES + sim.rng() * CHUNK_SIZE_TILES
            });
        }
        for (let i = 0; i < chunk.stats.catCount; i++) {
            spawnEntity(sim, 'cat', this.getRandomName('cat', sim), 'brave', {
                tx: cx * CHUNK_SIZE_TILES + sim.rng() * CHUNK_SIZE_TILES,
                ty: cy * CHUNK_SIZE_TILES + sim.rng() * CHUNK_SIZE_TILES
            });
        }

        chunk.stats.ratCount = 0;
        chunk.stats.catCount = 0;
    }

    /**
     * Active/Semi -> Far (Virtualize)
     */
    virtualizeChunk(id: ChunkId, sim: SimulationState) {
        const chunk = this.chunks.get(id);
        if (!chunk) return;

        const [cx, cy] = id.split(',').map(Number);
        const toRemove: string[] = [];
        let rats = 0;
        let cats = 0;

        for (const entity of sim.entities.values()) {
            const coords = this.getChunkCoords(entity.pos);
            if (coords.x === cx && coords.y === cy) {
                if (entity.species === 'rat') rats++;
                if (entity.species === 'cat') cats++;
                toRemove.push(entity.id);
            }
        }

        chunk.stats.ratCount = rats;
        chunk.stats.catCount = cats;
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
            obj.data!.regenRate = OBJECT_CONFIGS.water.regenRate;
        } else if (type === 'trash') {
            obj.data!.resources = OBJECT_CONFIGS.trash.maxResources;
            obj.data!.maxResources = OBJECT_CONFIGS.trash.maxResources;
            obj.data!.regenRate = OBJECT_CONFIGS.trash.regenRate;
        } else if (type === 'bush') {
            obj.data!.strength01 = OBJECT_CONFIGS.bush.strengthDefault;
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
