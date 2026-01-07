
import { describe, it, expect } from 'vitest';
import { calculateUtility, selectGoal } from './utility';
import type { EntityRuntime, SimState, SpeciesId } from '@shared/types';
import { RAT_CONFIG } from '@shared/species.config';

function createMockEntity(species: SpeciesId = 'rat'): EntityRuntime {
    return {
        id: 'e1',
        species: species,
        name: 'MockEntity',
        personality: 'brave',
        pos: { x: 100, y: 100 },
        vel: { x: 0, y: 0 },
        facing: 'n',
        vitals: {
            hunger01: 1.0, // Full
            thirst01: 1.0, // Full
            fatigue01: 1.0, // Full
            health01: 1.0
        },
        ageTicks: 0,
        state: 'idle',
        ai: {
            lastPerceptionTick: 0,
            lastDecisionTick: 0,
            currentGoal: 'wander',
            lastUtilityScores: {},
            recentStimuli: []
        },
        parents: [],
        children: [],
        generation: 0,
        history: [],
        path: []
    };
}

// Mock SimState (Partial)
const mockSim: any = {};

describe('Utility System', () => {
    describe('calculateUtility', () => {
        it('should prioritize water when thirsty', () => {
            const rat = createMockEntity('rat');
            rat.vitals.thirst01 = 0.1; // Very thirsty
            rat.ai.recentStimuli = [
                { type: 'water', objectId: 'w1', dist: 10 }
            ];

            const scores = calculateUtility(rat, mockSim);
            expect(scores.drink).toBeDefined();
            // Expected score: base(0.05) + urgency(1.4 * 0.9) approx 1.31
            expect(scores.drink).toBeGreaterThan(1.0);
            expect(scores.drink).toBeGreaterThan(scores.wander || 0);
        });

        it('should prioritize food when hungry', () => {
            const rat = createMockEntity('rat');
            rat.vitals.hunger01 = 0.1; // Very hungry
            rat.ai.recentStimuli = [
                { type: 'trash', objectId: 't1', dist: 10 }
            ];

            const scores = calculateUtility(rat, mockSim);
            expect(scores.eat).toBeDefined();
            expect(scores.eat).toBeGreaterThan(scores.wander || 0);
        });

        it('should prioritize flee when predator is nearby (for rat)', () => {
            const rat = createMockEntity('rat');
            // Mock seeing a predator very close
            rat.ai.recentStimuli = [
                { type: 'predator', entityId: 'pred1', dist: 5 } // Very close
            ];

            const scores = calculateUtility(rat, mockSim);
            expect(scores.flee).toBeGreaterThan(1); // Should be very high
        });

        it('should NOT flee if predator is far (for rat)', () => {
            const rat = createMockEntity('rat');
            // Mock seeing a predator far away (near limit of sense)
            // Rat sense radius is 10 tiles = 320px
            rat.ai.recentStimuli = [
                { type: 'predator', entityId: 'pred1', dist: 300 }
            ];

            const scores = calculateUtility(rat, mockSim);
            // Fear urgency 2.8 * (1 - 300/320) approx 2.8 * 0.06 = 0.16. Base flee 0.2. Total ~0.36
            expect(scores.flee).toBeLessThan(1.0);
        });

        it('should hunt when hungry (for cat)', () => {
            const cat = createMockEntity('cat');
            cat.vitals.hunger01 = 0.2; // Hungry
            // See prey
            cat.ai.recentStimuli = [
                { type: 'prey', entityId: 'prey1', dist: 100 }
            ];

            const scores = calculateUtility(cat, mockSim);
            expect(scores.hunt).toBeDefined();
            expect(scores.hunt).toBeGreaterThan(scores.wander || 0);
        });
    });

    describe('selectGoal', () => {
        it('should select goal with highest score', () => {
            const scores = {
                wander: 0.1,
                drink: 0.8,
                eat: 0.5
            };
            // Cast to correct type as we are mocking partial record
            const goal = selectGoal(scores as any);
            expect(goal).toBe('drink');
        });

        it('should default to wander if scores are low/empty', () => {
            const goal = selectGoal({ wander: 0.01 });
            expect(goal).toBe('wander');
        });
    });
});
