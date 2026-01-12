
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChunkManager } from './chunkManager';
import { V1 } from '../../shared/constants';
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
            graveyard: [],
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

        it('should spawn initial animals using defaultSpawns', () => {
            cm.initializeWorld(sim);

            // Calculate expected total spawns from V1.defaultSpawns
            const animalSpecies = [
                'rat', 'cat', 'chicken', 'smallBird', 'raccoon', 'crow',
                'dog', 'fox', 'hawk', 'wolf', 'snake'
            ];
            let expectedCount = 0;
            for (const s of animalSpecies) {
                expectedCount += (V1.defaultSpawns as any)[s] || 0;
            }

            expect(SpawnerModule.spawnEntity).toHaveBeenCalledTimes(expectedCount);
        });

        it('should only initialize once', () => {
            cm.initializeWorld(sim);
            const firstObjectCount = sim.objects.size;

            cm.initializeWorld(sim);
            // Should not add more objects on second call
            expect(sim.objects.size).toBe(firstObjectCount);
        });

        it('should spawn resources randomly on initialization', () => {
            cm.initializeWorld(sim);

            // Should have some water, trash, and bushes from random spawn + zone generation
            const waters = Array.from(sim.objects.values()).filter((o: any) => o.type === 'water');
            const bushes = Array.from(sim.objects.values()).filter((o: any) => o.type === 'bush');

            expect(waters.length).toBeGreaterThan(0);
            expect(bushes.length).toBeGreaterThan(0);
        });
    });

    describe('resetWorld', () => {
        it('should clear and regenerate everything', () => {
            cm.initializeWorld(sim);
            const initialObjectCount = sim.objects.size;
            const initialEntityCallCount = vi.mocked(SpawnerModule.spawnEntity).mock.calls.length;

            // Add some "garbage" to verify clearing
            sim.entities.set('garbage', {});
            sim.objects.set('garbage', {});
            sim.graveyard.push({});

            cm.resetWorld(sim);

            // Verify clearing
            expect(sim.graveyard.length).toBe(0);
            expect(sim.entities.has('garbage')).toBe(false);
            expect(sim.objects.has('garbage')).toBe(false);

            // Verify regeneration - should be comparable to initial
            // Might vary slightly due to random chunk generation if logic was specialized, 
            // but here it is deterministic given the mocks/fixed counts
            expect(sim.objects.size).toBeGreaterThan(0);
            // Should have called spawnEntity again relative to the reset
            expect(vi.mocked(SpawnerModule.spawnEntity).mock.calls.length).toBeGreaterThan(initialEntityCallCount);
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
