
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChunkManager } from './chunkManager';
import { V1 } from '@shared/constants';
import * as SpawnerModule from './spawner';

// Mock dependencies
vi.mock('./spawner', () => ({
    spawnEntity: vi.fn(),
}));

describe('ChunkManager', () => {
    let cm: ChunkManager;
    let sim: any;

    beforeEach(() => {
        cm = new ChunkManager();
        sim = {
            tick: 100,
            cameraCenter: { x: 0, y: 0 },
            entities: new Map(),
            objects: new Map(),
            rng: () => 0.5
        };
        vi.clearAllMocks();
    });

    describe('Coordinates', () => {
        it('should calculate correct chunk coords', () => {
            const chunkSizePx = V1.chunkSize * V1.tileSizePx;
            const pos = { x: chunkSizePx * 1.5, y: chunkSizePx * 2.5 };
            const coords = cm.getChunkCoords(pos);
            expect(coords.x).toBe(1);
            expect(coords.y).toBe(2);
        });

        it('should generate correct IDs', () => {
            expect(cm.getChunkId(1, -2)).toBe('1,-2');
        });
    });

    describe('updateLOD', () => {
        it('should activate chunks around camera', () => {
            // Camera at 0,0. Active radius 1.
            // Should activate -1,-1 to 1,1
            cm.updateLOD(sim);

            // 3x3 = 9 active chunks
            expect(cm.activeChunks.size).toBe(9);
            expect(cm.activeChunks.has('0,0')).toBe(true);
            expect(cm.activeChunks.has('1,1')).toBe(true);
            expect(cm.activeChunks.has('2,2')).toBe(false); // Too far
        });

        it('should manage chunk transitions', () => {
            // Start at 0,0
            cm.updateLOD(sim);
            expect(cm.activeChunks.has('0,0')).toBe(true);

            // Move camera far away
            const chunkSizePx = V1.chunkSize * V1.tileSizePx;
            sim.cameraCenter = { x: chunkSizePx * 10, y: 0 };

            cm.updateLOD(sim);
            expect(cm.activeChunks.has('0,0')).toBe(false);
            expect(cm.activeChunks.has('10,0')).toBe(true);
        });
    });

    describe('Lifecycle', () => {
        it('should generate new chunks', () => {
            cm.generateChunk('0,0', sim);
            const chunk = cm.chunks.get('0,0');
            expect(chunk).toBeDefined();
            expect(chunk?.stats).toBeDefined();
        });

        it('should virtualize chunks (save entity counts)', () => {
            // Setup chunk and entity
            cm.generateChunk('0,0', sim);
            const entity: any = { id: 'e1', species: 'rat', pos: { x: 10, y: 10 } }; // In chunk 0,0
            sim.entities.set('e1', entity);

            // Mock getChunkCoords to return 0,0 for this entity
            // Actually getChunkCoords works on math, 10,10 is in 0,0.

            cm.virtualizeChunk('0,0', sim);

            const chunk = cm.chunks.get('0,0');
            expect(chunk?.stats.ratCount).toBe(1);
            expect(sim.entities.has('e1')).toBe(false); // Should be removed
        });

        it('should realize chunks (spawn entities)', () => {
            cm.generateChunk('0,0', sim);
            const chunk = cm.chunks.get('0,0')!;
            chunk.stats.ratCount = 5;
            chunk.stats.catCount = 2;

            cm.realizeChunk('0,0', sim);

            expect(SpawnerModule.spawnEntity).toHaveBeenCalledTimes(7); // 5 rats + 2 cats
            expect(chunk.stats.ratCount).toBe(0); // Should be reset
        });

        it('should spawn objects on generation', () => {
            // Realize calls generateEntitiesAndObjects if new
            cm.realizeChunk('10,10', sim);

            // Check objects spawned
            expect(sim.objects.size).toBeGreaterThan(0);
        });
    });
});
