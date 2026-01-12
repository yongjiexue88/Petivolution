
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
            viewRectTiles: {
                leftTx: 8 * V1.chunkSize - 10,
                topTy: 8 * V1.chunkSize - 10,
                rightTx: 8 * V1.chunkSize + 10,
                bottomTy: 8 * V1.chunkSize + 10
            }
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
        it('should generate all chunks upfront', () => {
            cm.initializeWorld(sim);

            // Finite world starts with all 64 chunks (8x8)
            expect(cm.chunks.size).toBe(64);
            expect(cm.initialized).toBe(true);
            expect(cm.activeChunks.size).toBe(64);
        });

        it('should spawn initial animals', () => {
            cm.initializeWorld(sim);

            // Should have called spawnEntity for all configured animals
            const animalKeys = ['rat', 'cat', 'chicken', 'smallBird', 'raccoon', 'crow', 'dog', 'fox', 'hawk', 'wolf', 'snake'];
            const totalSpawns = animalKeys.reduce((sum, key) => sum + ((V1.defaultSpawns as any)[key] || 0), 0);
            expect(SpawnerModule.spawnEntity).toHaveBeenCalledTimes(totalSpawns);
        });

        it('should only initialize once', () => {
            cm.initializeWorld(sim);
            cm.initializeWorld(sim);
            // Counter for spawnEntity should not double
            const animalKeys = ['rat', 'cat', 'chicken', 'smallBird', 'raccoon', 'crow', 'dog', 'fox', 'hawk', 'wolf', 'snake'];
            const totalSpawns = animalKeys.reduce((sum, key) => sum + ((V1.defaultSpawns as any)[key] || 0), 0);
            expect(SpawnerModule.spawnEntity).toHaveBeenCalledTimes(totalSpawns);
        });
    });

    describe('updateLOD', () => {
        it('should keep all chunks active regardless of camera', () => {
            cm.initializeWorld(sim);

            // Initial call (camera at 8,8)
            cm.updateLOD(sim);
            expect(cm.activeChunks.size).toBe(64);

            // Move camera
            sim.cameraCenter = { x: chunkSizePx * 2, y: chunkSizePx * 2 };
            cm.updateLOD(sim);

            // Should still be 64
            expect(cm.activeChunks.size).toBe(64);
        });
    });

    describe('generateChunk', () => {
        it('should create chunk with biome data', () => {
            // Need to initialize first or just call generateChunk manually
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
