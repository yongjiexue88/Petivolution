
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
     * Update LOD based on camera position
     * For finite world, this is mostly a no-op since all chunks are active
     * Kept for compatibility
     */
    updateLOD(_sim: SimulationState) {
        // For finite world, all chunks are always active
        // No virtualization needed
    }

    /**
     * Generate objects for a chunk (water, bush, trash)
     */
    generateObjects(chunk: ChunkData, sim: SimulationState) {
        const [cx, cy] = chunk.id.split(',').map(Number);
        const startTx = cx * CHUNK_SIZE_TILES;
        const startTy = cy * CHUNK_SIZE_TILES;

        // Only spawn resources in center chunks (core zone)
        const chunksX = Math.ceil(V1.defaultMapWidth / CHUNK_SIZE_TILES);
        const chunksY = Math.ceil(V1.defaultMapHeight / CHUNK_SIZE_TILES);
        const centerChunkX = Math.floor(chunksX / 2);
        const centerChunkY = Math.floor(chunksY / 2);

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
