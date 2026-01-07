
import {
    ChunkId,
    ChunkData,
    ChunkState,
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
const ACTIVE_RADIUS = 1; // Chunks around camera to be ACTIVE (3x3)
const SEMI_ACTIVE_RADIUS = 2; // Chunks further out to be SEMI_ACTIVE (5x5)

export class ChunkManager {
    chunks: Map<ChunkId, ChunkData> = new Map();
    activeChunks: Set<ChunkId> = new Set();
    noise2D = createNoise2D();

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

    // Called every tick (or less freq) to update LOD based on camera
    updateLOD(sim: SimulationState) {
        // Camera center in world pixels
        const camX = sim.cameraCenter.x;
        const camY = sim.cameraCenter.y;

        const centerChunk = this.getChunkCoords({ x: camX, y: camY });
        const newActive = new Set<ChunkId>();
        const newSemi = new Set<ChunkId>();

        // Identify new zones
        for (let y = centerChunk.y - SEMI_ACTIVE_RADIUS; y <= centerChunk.y + SEMI_ACTIVE_RADIUS; y++) {
            for (let x = centerChunk.x - SEMI_ACTIVE_RADIUS; x <= centerChunk.x + SEMI_ACTIVE_RADIUS; x++) {
                const id = this.getChunkId(x, y);
                // Distance in chunks (Chebyshev distance for square grid)
                const dist = Math.max(Math.abs(x - centerChunk.x), Math.abs(y - centerChunk.y));

                if (dist <= ACTIVE_RADIUS) {
                    newActive.add(id);
                } else {
                    newSemi.add(id);
                }
            }
        }

        // Handle State Transitions
        // 1. Check existing active chunks
        for (const id of this.activeChunks) {
            if (!newActive.has(id)) {
                // Moving out of Active
                if (newSemi.has(id)) {
                    // Downgrade to Semi-Active
                    this.setChunkState(id, 'semi_active', sim);
                } else {
                    // Moving to Far (Virtualize)
                    this.virtualizeChunk(id, sim);
                }
            }
        }

        // 2. Check new active/semi chunks
        for (const id of newActive) {
            if (!this.activeChunks.has(id)) {
                // Moving into Active
                this.realizeChunk(id, sim);
                this.setChunkState(id, 'active', sim);
            }
        }

        for (const id of newSemi) {
            this.realizeChunk(id, sim);
        }

        this.activeChunks = newActive;
    }

    setChunkState(_id: ChunkId, _state: ChunkState, _sim: SimulationState) {
        // Placeholder for future state-specific logic
    }

    // Active/Semi -> Far (Simulate -> Stats)
    virtualizeChunk(id: ChunkId, sim: SimulationState) {
        if (!this.chunks.has(id)) return;

        const chunk = this.chunks.get(id)!;
        const [cx, cy] = id.split(',').map(Number);

        // Find entities
        const toRemove: string[] = [];
        let ratCount = 0;
        let catCount = 0;

        for (const entity of sim.entities.values()) {
            const c = this.getChunkCoords(entity.pos);
            if (c.x === cx && c.y === cy) {
                if (entity.species === 'rat') ratCount++;
                if (entity.species === 'cat') catCount++;
                toRemove.push(entity.id);
            }
        }

        chunk.stats.ratCount = ratCount;
        chunk.stats.catCount = catCount;
        chunk.stats.lastTick = sim.tick;

        for (const eid of toRemove) {
            sim.entities.delete(eid);
        }
    }

    // Far -> Active/Semi (Stats -> Simulate)
    realizeChunk(id: ChunkId, sim: SimulationState) {
        let chunk = this.chunks.get(id);

        if (!chunk) {
            this.generateChunk(id, sim);
            chunk = this.chunks.get(id)!;

            // New chunk -> Generate initial objects
            this.generateEntitiesAndObjects(chunk, sim);
        }

        // If reusing existing chunk, we rely on natural migration or spawn logic from stats
        const [cx, cy] = id.split(',').map(Number);

        // Simple Realization Logic:
        // Attempt to spawn entities based on stored stats.
        // Note: This is a rough approximation. We spawn NEW entities. 
        // In a real rigorous sim, we'd save the specific entities data serialised. 
        // For infinite world MVP, "Ship of Theseus" statistical approach is acceptable.

        // Prevent over-spawning if we just virtualized (check lastTick?)
        // For now, simpler: Just spawn up to count.

        // Count existing entities in this chunk to avoiding duping if realizing active chunk?
        // realizeChunk is only called when moving into Active/Semi.
        // Entities should have been removed during virtualization.

        // Spawn Rats
        for (let i = 0; i < chunk.stats.ratCount; i++) {
            const tx = cx * CHUNK_SIZE_TILES + Math.random() * CHUNK_SIZE_TILES;
            const ty = cy * CHUNK_SIZE_TILES + Math.random() * CHUNK_SIZE_TILES;
            spawnEntity(sim, 'rat', 'Wild Rat', 'cautious', { tx, ty });
        }

        // Spawn Cats
        for (let i = 0; i < chunk.stats.catCount; i++) {
            const tx = cx * CHUNK_SIZE_TILES + Math.random() * CHUNK_SIZE_TILES;
            const ty = cy * CHUNK_SIZE_TILES + Math.random() * CHUNK_SIZE_TILES;
            spawnEntity(sim, 'cat', 'Wild Cat', 'brave', { tx, ty });
        }

        // Reset stats after realization?
        // If we keep them in 'active', we don't need stats until we virtualize again.
        chunk.stats.ratCount = 0;
        chunk.stats.catCount = 0;
    }

    generateEntitiesAndObjects(chunk: ChunkData, sim: SimulationState) {
        const [cx, cy] = chunk.id.split(',').map(Number);
        const startTx = cx * CHUNK_SIZE_TILES;
        const startTy = cy * CHUNK_SIZE_TILES;

        // 1. Spawn Objects based on Noise/Stats

        const waterCount = Math.floor(chunk.stats.resourceLevel * 3); // 0-3 water sources
        for (let i = 0; i < waterCount; i++) {
            this.spawnObject(sim, 'water', startTx, startTy);
        }

        const bushCount = Math.floor(chunk.stats.resourceLevel * 5); // 0-5 bushes
        for (let i = 0; i < bushCount; i++) {
            this.spawnObject(sim, 'bush', startTx, startTy);
        }

        const trashCount = Math.floor(chunk.stats.dangerLevel * 3); // Danger -> Trash
        for (let i = 0; i < trashCount; i++) {
            this.spawnObject(sim, 'trash', startTx, startTy);
        }
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

        // Noise for Biomes
        const resourceNoise = this.noise2D(x * 0.1, y * 0.1);
        const dangerNoise = this.noise2D(x * 0.1 + 100, y * 0.1 + 100);

        const resourceLevel = (resourceNoise + 1) / 2; // 0..1
        const dangerLevel = (dangerNoise + 1) / 2;

        const chunk: ChunkData = {
            id,
            x,
            y,
            stats: {
                ratCount: Math.floor(resourceLevel * 5),
                catCount: Math.floor(dangerLevel * 2),
                resourceLevel,
                dangerLevel,
                lastTick: sim.tick
            }
        };
        this.chunks.set(id, chunk);
    }
}
