
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChunkManager } from './chunkManager';
import { V1 } from '@shared/constants';
import * as SpawnerModule from './spawner';

// Mock spawner
vi.mock('./spawner', () => ({
    spawnEntity: vi.fn(() => ({ id: 'test-entity' }))
}));

describe('ChunkManager (Fishbowl)', () => {
    let cm: ChunkManager;
    let sim: any;
    const chunkSizePx = V1.chunkSize * V1.tileSizePx;

    beforeEach(() => {
        vi.clearAllMocks();
        cm = new ChunkManager();
        sim = {
            tick: 0,
            entities: new Map(),
            objects: new Map(),
            rng: () => 0.5,
            cameraCenter: { x: chunkSizePx * 8, y: chunkSizePx * 8 }, // Center of 16x16 chunk grid
            cameraZoom: 1,
        };
    });

    describe('Coordinates', () => {
        it('should calculate correct chunk coords', () => {
            const coords = cm.getChunkCoords({ x: chunkSizePx * 2 + 10, y: chunkSizePx * 3 + 5 });
            expect(coords.x).toBe(2);
            expect(coords.y).toBe(3);
        });

        it('should generate correct IDs', () => {
            expect(cm.getChunkId(5, 7)).toBe('5,7');
        });
    });

    describe('initializeWorld', () => {
        it('should generate all chunks for finite world', () => {
            cm.initializeWorld(sim);

            const expectedChunks = Math.ceil(V1.defaultMapWidth / V1.chunkSize) *
                Math.ceil(V1.defaultMapHeight / V1.chunkSize);

            expect(cm.chunks.size).toBe(expectedChunks);
            expect(cm.initialized).toBe(true);
        });

        it('should spawn initial animals', () => {
            cm.initializeWorld(sim);

            // Should have called spawnEntity for rats and cats
            const totalSpawns = V1.defaultSpawns.rat + V1.defaultSpawns.cat;
            expect(SpawnerModule.spawnEntity).toHaveBeenCalledTimes(totalSpawns);
        });

        it('should only initialize once', () => {
            cm.initializeWorld(sim);
            const firstObjectCount = sim.objects.size;

            cm.initializeWorld(sim);
            // Should not add more objects on second call
            expect(sim.objects.size).toBe(firstObjectCount);
        });

        it('should spawn objects in center chunks', () => {
            cm.initializeWorld(sim);

            // Should have water, trash, and bushes
            const hasWater = Array.from(sim.objects.values()).some((o: any) => o.type === 'water');
            const hasBush = Array.from(sim.objects.values()).some((o: any) => o.type === 'bush');

            expect(hasWater).toBe(true);
            expect(hasBush).toBe(true);
        });
    });

    describe('updateLOD', () => {
        it('should be a no-op for finite world', () => {
            cm.initializeWorld(sim);
            const activeCount = cm.activeChunks.size;

            // Move camera around
            sim.cameraCenter = { x: 0, y: 0 };
            cm.updateLOD(sim);

            // Should not change anything
            expect(cm.activeChunks.size).toBe(activeCount);
        });
    });

    describe('generateChunk', () => {
        it('should create chunk with biome data', () => {
            cm.generateChunk('5,5', sim);

            const chunk = cm.chunks.get('5,5');
            expect(chunk).toBeDefined();
            expect(chunk!.x).toBe(5);
            expect(chunk!.y).toBe(5);
            expect(chunk!.stats.resourceLevel).toBeGreaterThanOrEqual(0);
            expect(chunk!.stats.resourceLevel).toBeLessThanOrEqual(1);
        });
    });
});
