import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSimulation, simulateTick, recordEvent, getSnapshot } from './tick';
import * as UtilityModule from '../ai/utility';
import * as ActionsModule from '../ai/actions';
import { V1 } from '@shared/constants';

// Mock dependencies
vi.mock('../ai/perception', () => ({
    perceive: vi.fn(() => ({ stimuli: [] })),
}));
vi.mock('../ai/utility', () => ({
    calculateUtility: vi.fn(() => ({ wander: 0.5 })),
    selectGoal: vi.fn(() => 'wander'),
}));
vi.mock('../ai/actions', () => ({
    executeAction: vi.fn(),
}));
vi.mock('./chunkManager', () => {
    return {
        ChunkManager: vi.fn().mockImplementation(() => ({
            updateLOD: vi.fn(),
            getChunkId: vi.fn((x, y) => `${x},${y}`),
            activeChunks: { has: () => true },
            semiActiveChunks: { has: () => false },
        }))
    };
});

describe('Simulation Core', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createSimulation', () => {
        it('should initialize with default state', () => {
            const sim = createSimulation(123);
            expect(sim.tick).toBe(0);
            expect(sim.seed).toBe(123);
            expect(sim.entities.size).toBe(0);
        });
    });

    describe('simulateTick', () => {
        it('should run simulation steps', () => {
            const sim = createSimulation(123);


            sim.rules.timeScale = 1;
            sim.cameraCenter = { x: 100, y: 100 };

            // Add a test entity
            const entity: any = {
                id: 'e1',
                species: 'rat',
                state: 'idle',
                pos: { x: 100, y: 100 },
                vitals: { hunger01: 1, thirst01: 1, fatigue01: 1, health01: 1 },
                history: [],
                path: [],
                children: [],
                ai: {
                    lastPerceptionTick: 0,
                    lastDecisionTick: 0,
                    recentStimuli: [],
                    currentGoal: 'wander'
                }
            };
            sim.entities.set('e1', entity);

            simulateTick(sim);

            expect(sim.tick).toBe(1);
            // Verify action executed
            expect(ActionsModule.executeAction).toHaveBeenCalledWith(entity, sim);

            // Verify vitals updated (hunger should decrease)
            expect(entity.vitals.hunger01).toBeLessThan(1);
        });

        it('should handle death when stats run out', () => {
            const sim = createSimulation(123);
            sim.rules.timeScale = 1;

            const entity: any = {
                id: 'e1',
                species: 'rat',
                state: 'idle',
                pos: { x: 100, y: 100 },
                vitals: { hunger01: 0, thirst01: 1, fatigue01: 1, health01: 0 }, // Dead
                history: [],
                path: [],
                children: [],
                ai: {},
                name: 'DeadRat'
            };
            sim.entities.set('e1', entity);

            simulateTick(sim);

            // Entity should be marked dead and removed from active map
            // Note: In simulateTick logic, deadEntities loop removes it.
            // But handleDeath sets state='dead'.
            // The loop condition is: if (entity.state === 'dead') continue.
            // Then logic checks if health <= 0 -> handleDeath -> push to deadEntities.

            expect(sim.entities.has('e1')).toBe(false);
            expect(sim.graveyard).toHaveLength(1);
            expect(sim.graveyard[0].entityId).toBe('e1');
            expect(sim.pendingEvents[0].type).toBe('DEATH');
        });

        it('should make decisions every N ticks', () => {
            const sim = createSimulation(123);
            sim.rules.timeScale = 1;
            sim.tick = V1.decisionEveryNTicks - 1; // Next tick will be N
            sim.cameraCenter = { x: 100, y: 100 }; // Ensure entity is in LOD range

            const entity: any = {
                id: 'e1',
                species: 'rat',
                state: 'idle',
                pos: { x: 100, y: 100 },
                vitals: { hunger01: 1, thirst01: 1, fatigue01: 1, health01: 1 },
                history: [],
                path: [],
                children: [],
                ai: {
                    lastPerceptionTick: 0,
                    lastDecisionTick: 0,
                    recentStimuli: [],
                    currentGoal: 'wander'
                },
                name: 'ThinkingRat'
            };
            sim.entities.set('e1', entity);

            simulateTick(sim);

            expect(UtilityModule.calculateUtility).toHaveBeenCalled();
            expect(UtilityModule.selectGoal).toHaveBeenCalled();
            expect(entity.ai.lastDecisionTick).toBe(sim.tick);
        });
    });

    describe('recordEvent', () => {
        it('should push event to global and local history', () => {
            const sim = createSimulation(123);
            const entity: any = {
                id: 'e1',
                history: []
            };
            const event: any = { type: 'TEST', tick: 10 };

            recordEvent(sim, entity, event);

            expect(sim.pendingEvents).toContain(event);
            expect(entity.history).toContain(event);
        });

        it('should cap history at 20', () => {
            const sim = createSimulation(123);
            // Pre-fill history
            const entity: any = {
                id: 'e1',
                history: Array(20).fill({ type: 'OLD' })
            };
            const event: any = { type: 'NEW', tick: 10 };

            recordEvent(sim, entity, event);

            expect(entity.history).toHaveLength(20);
            expect(entity.history[19]).toBe(event);
            expect(entity.history[0].type).toBe('OLD'); // OLD[1] became index 0
        });
    });

    describe('getSnapshot', () => {
        it('should return valid snapshot', () => {
            const sim = createSimulation(123);
            const entity: any = {
                id: 'e1', species: 'rat', name: 'R', pos: { x: 0, y: 0 },
                facing: 'n', state: 'idle', vitals: { health01: 1 }
            };
            sim.entities.set('e1', entity);
            sim.pendingEvents.push({ type: 'BIRTH', tick: 0, entityId: 'e1', parentId: 'e0' });

            const snap = getSnapshot(sim);
            expect(snap.entities).toHaveLength(1);
            expect(snap.entities[0].id).toBe('e1');
            expect(snap.events).toHaveLength(1);
            expect(sim.pendingEvents).toHaveLength(0); // Should clear events
            expect(snap.stats.rat).toBe(1);
        });
    });

    describe('Stats Warning', () => {
        it('should set warning if entities are critical', () => {
            const sim = createSimulation(123);
            const e1: any = { id: 'e1', species: 'rat', vitals: { hunger01: 0.1, thirst01: 1, health01: 1 }, pos: { x: 0, y: 0 } };
            const e2: any = { id: 'e2', species: 'rat', vitals: { hunger01: 1, thirst01: 0.1, health01: 1 }, pos: { x: 0, y: 0 } };
            sim.entities.set('e1', e1);
            sim.entities.set('e2', e2); // 2/2 critical

            getSnapshot(sim);
            expect(sim.stats.warning).toBe(true);
        });

        it('should not set warning if entities healthy', () => {
            const sim = createSimulation(123);
            const e1: any = { id: 'e1', species: 'rat', vitals: { hunger01: 0.8, thirst01: 1, health01: 1 }, pos: { x: 0, y: 0 } };
            sim.entities.set('e1', e1);

            getSnapshot(sim);
            expect(sim.stats.warning).toBe(false);
        });

        it('should handle empty entities', () => {
            const sim = createSimulation(123);
            getSnapshot(sim);
            expect(sim.stats.warning).toBe(false);
        });
    });
});

