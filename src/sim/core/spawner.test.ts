
import { describe, it, expect } from 'vitest';
import { spawnEntity, canSpawn } from './spawner';
import { V1 } from '@shared/constants';

describe('Spawner System', () => {
    describe('canSpawn', () => {
        it('should allow spawn if below cap', () => {
            const sim: any = {
                rules: { capsEnabled: true },
                entities: new Map([['e1', { species: 'rat', state: 'idle' }]])
            };
            // Rat cap is likely > 1
            expect(canSpawn('rat', sim)).toBe(true);
        });

        it('should deny spawn if at cap', () => {
            const cap = V1.capGlobal.rat;
            const entities = new Map();
            for (let i = 0; i < cap; i++) {
                entities.set(`r${i}`, { species: 'rat', state: 'idle' });
            }

            const sim: any = {
                rules: { capsEnabled: true },
                entities
            };

            expect(canSpawn('rat', sim)).toBe(false);
        });

        it('should ignore dead entities for cap', () => {
            const cap = V1.capGlobal.rat;
            const entities = new Map();
            for (let i = 0; i < cap; i++) {
                entities.set(`r${i}`, { species: 'rat', state: 'dead' });
            }

            const sim: any = {
                rules: { capsEnabled: true },
                entities
            };

            expect(canSpawn('rat', sim)).toBe(true);
        });
    });

    describe('spawnEntity', () => {
        it('should create entity and add to sim', () => {
            const sim: any = {
                rules: { capsEnabled: true },
                entities: new Map(),
                stats: { birthsThisMinute: 0 },
                rng: () => 0.5
            };

            const ent = spawnEntity(sim, 'rat', 'Rat1', 'brave', { tx: 10, ty: 10 });

            expect(ent).toBeDefined();
            expect(ent?.species).toBe('rat');
            expect(ent?.state).toBe('idle');
            expect(sim.entities.size).toBe(1);
            expect(sim.stats.birthsThisMinute).toBe(1);
        });

        it('should return null if cannot spawn', () => {
            const sim: any = {
                rules: { capsEnabled: true },
                entities: new Map(),
                stats: { birthsThisMinute: 0 },
                rng: () => 0.5
            };
            // Mock cannot spawn
            // We can't easily mock canSpawn since it is exported from same file.
            // But we can force condition.
            // Fill up cap.
            const cap = V1.capGlobal.rat;
            for (let i = 0; i < cap; i++) {
                sim.entities.set(`r${i}`, { species: 'rat', state: 'idle' });
            }

            const ent = spawnEntity(sim, 'rat', 'Rat1', 'brave', { tx: 10, ty: 10 });
            expect(ent).toBeNull();
        });
    });
});
