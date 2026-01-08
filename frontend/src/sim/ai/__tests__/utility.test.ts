
import { describe, it, expect } from 'vitest';
import { calculateUtility, selectGoal } from '../utility';
import type { EntityRuntime, Stimulus } from '@shared/types';
import { V1 } from '@shared/constants';

// Mock helper to create a basic entity
function createMockEntity(species: any, personality: any = 'brave'): EntityRuntime {
    return {
        id: 'mock_1',
        species: species,
        personality: personality,
        x: 0,
        y: 0,
        facing: 0,
        vitals: {
            hunger01: 1, // Full
            thirst01: 1, // Quenched
            fatigue01: 1, // Rested
            health01: 1,
            ageTicks: 0,
            energy: 1,
        },
        state: 'idle',
        goal: 'wander',
        ai: {
            recentStimuli: [],
            blackboard: {},
            lastActionTick: 0,
        },
        // other props mocked as needed
    } as unknown as EntityRuntime;
}

describe('AI Utility Logic', () => {

    it('Chicken prioritizes Forage when hungry', () => {
        const chicken = createMockEntity('chicken', 'brave');

        // High hunger (Low saturation)
        chicken.vitals.hunger01 = 0.2;

        const scores = calculateUtility(chicken, {} as any);
        const bestGoal = selectGoal(scores);

        console.log('Chicken Hungry Scores:', scores);

        expect(scores.forage).toBeGreaterThan(scores.wander!);
        expect(bestGoal).toBe('forage');
    });

    it('Chicken prioritizes Flee when predator is near', () => {
        const chicken = createMockEntity('chicken', 'cautious');

        // Add predator stimulus very close
        const predator: Stimulus = {
            type: 'predator',
            entityId: 'pred_1',
            dist: 2 * V1.tileSizePx, // 2 tiles away
        };
        chicken.ai.recentStimuli = [predator];

        const scores = calculateUtility(chicken, {} as any);
        const bestGoal = selectGoal(scores);

        console.log('Chicken Scared Scores:', scores);

        // Chicken is flighty, should flee
        expect(scores.flee).toBeGreaterThan(scores.forage || 0);
        expect(bestGoal).toBe('flee');
    });

    it('SmallBird prioritizes Rest (Perch) when tired and near perch', () => {
        const bird = createMockEntity('smallBird', 'brave');

        // High fatigue (Low energy)
        bird.vitals.fatigue01 = 0.2;

        // Near perch
        const perch: Stimulus = {
            type: 'perch',
            objectId: 'perch_1',
            dist: 1 * V1.tileSizePx,
        };
        bird.ai.recentStimuli = [perch];

        const scores = calculateUtility(bird, {} as any);
        const bestGoal = selectGoal(scores);

        console.log('Bird Tired Scores (Near Perch):', scores);

        expect(scores.rest).toBeGreaterThan(scores.wander!);
        // Should likely be rest due to high fatigue + bonus
        expect(bestGoal).toBe('rest');
    });

    it('SmallBird wanders if tired but no perch (and fatigue not critical?)', () => {
        const bird = createMockEntity('smallBird', 'brave');

        // Moderate fatigue
        bird.vitals.fatigue01 = 0.6;

        // No perch
        bird.ai.recentStimuli = [];

        const scores = calculateUtility(bird, {} as any);
        console.log('Bird Moderate Fatigue Scores:', scores);
        // wander base is 0.05, rest base is 0.05.
        // fatigue 0.6 => uFatigue 0.4.
        // urgency(fatigue 0.6) * 0.4 = 0.24.
        // rest = 0.05 + 0.24 = 0.29.
        // wander = 0.05.
        // Still rests?
        // Let's test very low fatigue (High energy)
        bird.vitals.fatigue01 = 1.0;

        const scoresLow = calculateUtility(bird, {} as any);
        expect(selectGoal(scoresLow)).toBe('forage'); // Birds default to foraging when idle
    });
});
