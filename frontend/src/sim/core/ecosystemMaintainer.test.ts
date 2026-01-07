
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    maintainEcosystem,
    getActiveZone,
    countEntitiesInZone
} from './ecosystemMaintainer';
import { V1 } from '@shared/constants';
import * as SpawnerModule from './spawner';

// Mock spawner
vi.mock('./spawner', () => ({
    spawnEntity: vi.fn(() => ({ id: 'test-entity' }))
}));

describe('EcosystemMaintainer', () => {
    const TILE_PX = V1.tileSizePx;

    const createMockSim = (entities: Map<string, any> = new Map()) => ({
        tick: 100,
        entities,
        objects: new Map([
            ['trash1', { id: 'trash1', type: 'trash', pos: { tx: 256, ty: 256 } }],
            ['water1', { id: 'water1', type: 'water', pos: { tx: 260, ty: 260 } }],
        ]),
        cameraCenter: { x: 256 * TILE_PX, y: 256 * TILE_PX }, // Center of 512x512 map
        cameraZoom: 1,
        rng: () => 0.5,
        stats: {
            ecoStress: 0
        }
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getActiveZone', () => {
        it('should return zone centered on camera', () => {
            const sim = createMockSim();
            const zone = getActiveZone(sim as any);

            expect(zone.centerX).toBe(sim.cameraCenter.x);
            expect(zone.centerY).toBe(sim.cameraCenter.y);
            expect(zone.radiusPx).toBe(V1.activeZoneRadiusTiles * TILE_PX);
        });
    });

    describe('countEntitiesInZone', () => {
        it('should count entities within active zone radius', () => {
            const sim = createMockSim();
            const centerX = sim.cameraCenter.x;
            const centerY = sim.cameraCenter.y;

            // Add entities: some inside zone, some outside
            sim.entities.set('rat1', { species: 'rat', state: 'idle', pos: { x: centerX, y: centerY } });
            sim.entities.set('rat2', { species: 'rat', state: 'idle', pos: { x: centerX + 100, y: centerY } });
            sim.entities.set('cat1', { species: 'cat', state: 'idle', pos: { x: centerX, y: centerY + 50 } });
            // This one is far outside
            sim.entities.set('rat3', { species: 'rat', state: 'idle', pos: { x: 0, y: 0 } });

            const counts = countEntitiesInZone(sim as any);

            // rat1, rat2 inside; cat1 inside; rat3 outside
            expect(counts.rat).toBe(2);
            expect(counts.cat).toBe(1);
        });

        it('should ignore dead entities', () => {
            const sim = createMockSim();
            const centerX = sim.cameraCenter.x;
            const centerY = sim.cameraCenter.y;

            sim.entities.set('rat1', { species: 'rat', state: 'dead', pos: { x: centerX, y: centerY } });
            sim.entities.set('rat2', { species: 'rat', state: 'idle', pos: { x: centerX, y: centerY } });

            const counts = countEntitiesInZone(sim as any);

            expect(counts.rat).toBe(1);
        });
    });

    describe('maintainEcosystem', () => {
        it('should spawn rats when below minimum', () => {
            const sim = createMockSim();
            // No rats in zone = below minimum (25)

            maintainEcosystem(sim as any);

            // Should spawn up to 3 rats
            expect(SpawnerModule.spawnEntity).toHaveBeenCalled();
            const calls = (SpawnerModule.spawnEntity as any).mock.calls;
            const ratCalls = calls.filter((c: any) => c[1] === 'rat');
            expect(ratCalls.length).toBeGreaterThan(0);
            expect(ratCalls.length).toBeLessThanOrEqual(3);
        });

        it('should spawn cats when below minimum', () => {
            const sim = createMockSim();
            const centerX = sim.cameraCenter.x;
            const centerY = sim.cameraCenter.y;

            // Add enough rats but no cats
            for (let i = 0; i < 30; i++) {
                sim.entities.set(`rat${i}`, {
                    species: 'rat',
                    state: 'idle',
                    pos: { x: centerX + i, y: centerY }
                });
            }

            maintainEcosystem(sim as any);

            // Should spawn a cat
            const calls = (SpawnerModule.spawnEntity as any).mock.calls;
            const catCalls = calls.filter((c: any) => c[1] === 'cat');
            expect(catCalls.length).toBe(1);
        });

        it('should not spawn when population is healthy', () => {
            const sim = createMockSim();
            const centerX = sim.cameraCenter.x;
            const centerY = sim.cameraCenter.y;

            // Add healthy population: 30 rats, 3 cats
            for (let i = 0; i < 30; i++) {
                sim.entities.set(`rat${i}`, {
                    species: 'rat',
                    state: 'idle',
                    pos: { x: centerX + i, y: centerY }
                });
            }
            for (let i = 0; i < 3; i++) {
                sim.entities.set(`cat${i}`, {
                    species: 'cat',
                    state: 'idle',
                    pos: { x: centerX, y: centerY + i }
                });
            }

            maintainEcosystem(sim as any);

            // Should not spawn anything
            expect(SpawnerModule.spawnEntity).not.toHaveBeenCalled();
        });

        it('should handle overpopulation by logging (not killing)', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
            const sim = createMockSim();
            const centerX = sim.cameraCenter.x;
            const centerY = sim.cameraCenter.y;

            // Add too many rats (> 55)
            for (let i = 0; i < 60; i++) {
                sim.entities.set(`rat${i}`, {
                    species: 'rat',
                    state: 'idle',
                    pos: { x: centerX + i % 100, y: centerY }
                });
            }
            // Add enough cats
            for (let i = 0; i < 3; i++) {
                sim.entities.set(`cat${i}`, {
                    species: 'cat',
                    state: 'idle',
                    pos: { x: centerX, y: centerY + i }
                });
            }

            maintainEcosystem(sim as any);

            // Should log warning about overpopulation
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('overpopulation'));
            consoleSpy.mockRestore();
        });
    });
});
