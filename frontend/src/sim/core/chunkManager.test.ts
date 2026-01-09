
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
        it('should NOT generate all chunks upfront', () => {
            cm.initializeWorld(sim);

            // Infinite world starts with 0 chunks until updateLOD is called
            expect(cm.chunks.size).toBe(0);
            expect(cm.initialized).toBe(true);
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
        it('should dynamically add chunks as camera moves', () => {
            cm.initializeWorld(sim);

            // Initial call (camera at 8,8)
            cm.updateLOD(sim);
            const initialChunks = cm.chunks.size;
            expect(initialChunks).toBeGreaterThan(0);
            expect(cm.activeChunks.size).toBeGreaterThan(0);

            const firstActiveId = Array.from(cm.activeChunks)[0];

            // Move camera to a valid location (e.g. 2,2 chunk) which is far from 8,8 but within 0-7 bounds
            // 2,2 chunk = 2*32*16 = 1024 px
            sim.cameraCenter = { x: chunkSizePx * 2, y: chunkSizePx * 2 };

            const startTx = 2 * V1.chunkSize;
            sim.viewRectTiles = {
                leftTx: startTx - 10,
                topTy: startTx - 10,
                rightTx: startTx + 10,
                bottomTy: startTx + 10
            };

            cm.updateLOD(sim);

            expect(cm.chunks.size).toBeGreaterThan(initialChunks);
            expect(cm.activeChunks.has(firstActiveId)).toBe(false);
        });

        it('should increase active radius when zooming out', () => {
            cm.initializeWorld(sim);

            // Zoom 1
            sim.cameraZoom = 1;
            // Setup view for Zoom 1 (e.g. 20x20 view)
            const cTx = 8 * V1.chunkSize;
            sim.viewRectTiles = { leftTx: cTx - 10, topTy: cTx - 10, rightTx: cTx + 10, bottomTy: cTx + 10 };

            cm.updateLOD(sim);
            const zoom1ActiveCount = cm.activeChunks.size;

            // Zoom 0.2 (zoomed out -> larger view)
            sim.cameraZoom = 0.2;
            // Setup view for Zoom 0.2 (e.g. 100x100 view)
            sim.viewRectTiles = { leftTx: cTx - 50, topTy: cTx - 50, rightTx: cTx + 50, bottomTy: cTx + 50 };

            cm.updateLOD(sim);
            const zoomOutActiveCount = cm.activeChunks.size;

            expect(zoomOutActiveCount).toBeGreaterThan(zoom1ActiveCount);
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
