
import { describe, it, expect } from 'vitest';
import { spawnEntity, canSpawn } from './spawner';
import { V1 } from '@shared/constants';

describe('Spawner System', () => {
    const createMockSim = (entities: Map<string, any> = new Map()) => ({
        rules: { capsEnabled: true },
        entities,
        stats: { birthsThisMinute: 0 },
        rng: () => 0.5,
        chunkManager: {
            activeChunks: new Set(['0,0', '1,0', '0,1', '1,1']) // 4 active chunks
        } as any
    });

    describe('canSpawn (per-chunk caps)', () => {
        it('should allow spawn if chunk is below cap', () => {
            const sim = createMockSim(new Map([
                ['e1', { species: 'rat', state: 'idle', pos: { x: 16, y: 16 } }]
            ]));
            // Rat cap per chunk is 20, so 1 rat should allow more
            expect(canSpawn('rat', sim as any, { tx: 1, ty: 1 })).toBe(true);
        });

        it('should deny spawn if chunk is at cap', () => {
            const cap = V1.capPerChunk.rat;
            const entities = new Map();
            // All entities in chunk (0, 0) - tiles 0-31
            for (let i = 0; i < cap; i++) {
                entities.set(`r${i}`, {
                    species: 'rat',
                    state: 'idle',
                    pos: { x: i * 16 % (V1.chunkSize * V1.tileSizePx), y: 16 }
                });
            }

            const sim = createMockSim(entities);

            // Try to spawn in chunk (0, 0)
            expect(canSpawn('rat', sim as any, { tx: 5, ty: 5 })).toBe(false);
        });

        it('should allow spawn in different chunk even if another is full', () => {
            const cap = V1.capPerChunk.rat;
            const entities = new Map();
            // All entities in chunk (0, 0)
            for (let i = 0; i < cap; i++) {
                entities.set(`r${i}`, {
                    species: 'rat',
                    state: 'idle',
                    pos: { x: 16, y: 16 } // All in chunk 0,0
                });
            }

            const sim = createMockSim(entities);

            // Try to spawn in chunk (1, 0) - tile position 32+
            expect(canSpawn('rat', sim as any, { tx: 40, ty: 5 })).toBe(true);
        });

        it('should ignore dead entities for cap', () => {
            const cap = V1.capPerChunk.rat;
            const entities = new Map();
            for (let i = 0; i < cap; i++) {
                entities.set(`r${i}`, {
                    species: 'rat',
                    state: 'dead',
                    pos: { x: 16, y: 16 }
                });
            }

            const sim = createMockSim(entities);

            expect(canSpawn('rat', sim as any, { tx: 5, ty: 5 })).toBe(true);
        });

        it('should check total active entities when no position specified', () => {
            const sim = createMockSim();
            // 4 active chunks * 20 cap = 80 max rats
            // With 0 entities, should allow
            expect(canSpawn('rat', sim as any)).toBe(true);
        });
    });

    describe('spawnEntity', () => {
        it('should create entity and add to sim', () => {
            const sim = createMockSim();

            const ent = spawnEntity(sim as any, 'rat', 'Rat1', 'brave', { tx: 10, ty: 10 });

            expect(ent).toBeDefined();
            expect(ent?.species).toBe('rat');
            expect(ent?.state).toBe('idle');
            expect(sim.entities.size).toBe(1);
            expect(sim.stats.birthsThisMinute).toBe(1);
        });

        it('should return null if chunk is at cap', () => {
            const cap = V1.capPerChunk.rat;
            const entities = new Map();
            // Fill chunk (0, 0)
            for (let i = 0; i < cap; i++) {
                entities.set(`r${i}`, {
                    species: 'rat',
                    state: 'idle',
                    pos: { x: 16, y: 16 }
                });
            }

            const sim = createMockSim(entities);

            // Try to spawn in same chunk (0, 0)
            const ent = spawnEntity(sim as any, 'rat', 'Rat1', 'brave', { tx: 10, ty: 10 });
            expect(ent).toBeNull();
        });
    });
});
