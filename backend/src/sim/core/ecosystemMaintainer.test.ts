
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    maintainEcosystem,
    countEntitiesGlobal
} from './ecosystemMaintainer';
import { V1 } from '../../shared/constants';
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
            ['trash1', { id: 'trash1', type: 'trash', pos: { tx: 128, ty: 128 } }],
            ['water1', { id: 'water1', type: 'water', pos: { tx: 132, ty: 132 } }],
        ]),
        cameraCenter: { x: 128 * TILE_PX, y: 128 * TILE_PX },
        cameraZoom: 1,
        stats: { ecoStress: 0 },
        rng: () => 0.5,
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('countEntitiesGlobal', () => {
        it('should count all living entities on map', () => {
            const sim = createMockSim();
            const centerX = sim.cameraCenter.x;
            const centerY = sim.cameraCenter.y;

            // Add entities at various positions
            sim.entities.set('rat1', { species: 'rat', state: 'idle', pos: { x: centerX, y: centerY } });
            sim.entities.set('rat2', { species: 'rat', state: 'idle', pos: { x: 0, y: 0 } }); // Far away
            sim.entities.set('cat1', { species: 'cat', state: 'idle', pos: { x: centerX, y: centerY + 50 } });

            const counts = countEntitiesGlobal(sim as any);

            expect(counts.rat).toBe(2);
            expect(counts.cat).toBe(1);
        });

        it('should ignore dead entities', () => {
            const sim = createMockSim();
            sim.entities.set('rat1', { species: 'rat', state: 'dead', pos: { x: 0, y: 0 } });
            sim.entities.set('rat2', { species: 'rat', state: 'idle', pos: { x: 0, y: 0 } });

            const counts = countEntitiesGlobal(sim as any);

            expect(counts.rat).toBe(1);
        });
    });

    describe('maintainEcosystem', () => {
        it('should spawn rats globally when below minimum', () => {
            const sim = createMockSim();
            // No rats = below minimum

            maintainEcosystem(sim as any);

            // Should spawn
            expect(SpawnerModule.spawnEntity).toHaveBeenCalled();
            const calls = (SpawnerModule.spawnEntity as any).mock.calls;
            const ratCalls = calls.filter((c: any) => c[1] === 'rat');
            expect(ratCalls.length).toBeGreaterThan(0);
        });

        it('should spawn cats globally when below minimum', () => {
            const sim = createMockSim();
            maintainEcosystem(sim as any);

            // Should spawn a cat
            const calls = (SpawnerModule.spawnEntity as any).mock.calls;
            const catCalls = calls.filter((c: any) => c[1] === 'cat');
            expect(catCalls.length).toBeGreaterThan(0);
        });

        it('should not spawn when population is globally healthy', () => {
            const sim = createMockSim();
            const centerX = sim.cameraCenter.x;

            // Add healthy population for ALL species
            for (const [species, targetVal] of Object.entries(V1.densityTargets)) {
                const target = targetVal as { min: number; max: number };
                for (let i = 0; i < target.min + 1; i++) {
                    sim.entities.set(`${species}${i}`, {
                        species: species,
                        state: 'idle',
                        pos: { x: centerX, y: centerX }
                    });
                }
            }

            maintainEcosystem(sim as any);

            // Should not spawn anything
            expect(SpawnerModule.spawnEntity).not.toHaveBeenCalled();
        });
    });
});
