
import { describe, it, expect } from 'vitest';
import { executeAction } from './actions';
import type { EntityRuntime } from '@shared/types';
import { V1 } from '@shared/constants';

function createMockEntity(id: string, species: 'rat' | 'cat'): EntityRuntime {
    return {
        id, species,
        name: 'Mock',
        sex: 'male',
        personality: 'curious',
        pos: { x: 100, y: 100 },
        vel: { x: 0, y: 0 },
        facing: 'n',
        vitals: { hunger01: 1, thirst01: 1, fatigue01: 1, health01: 1 },
        ageTicks: 0,
        state: 'idle',
        ai: {
            lastPerceptionTick: 0,
            lastDecisionTick: 0,
            currentGoal: 'wander',
            lastUtilityScores: {},
            recentStimuli: [],
        },
        history: [],
        path: [],
        parents: [],
        children: [],
        generation: 0,
    };
}

describe('Actions System', () => {
    describe('executeWander', () => {
        it('should pick a new target if none exists', () => {
            const ent = createMockEntity('e1', 'rat');
            ent.state = 'wander';
            const sim: any = { rng: () => 0.5 };

            executeAction(ent, sim);
            expect(ent.targetPos).toBeDefined();
            expect(ent.targetPos?.x).toBe(100);
            expect(ent.targetPos?.y).toBe(100);
        });

        it('should move towards target', () => {
            const ent = createMockEntity('e1', 'rat');
            ent.state = 'wander';
            ent.targetPos = { x: 200, y: 100 }; // East
            const sim: any = { rng: () => 0.5 };

            executeAction(ent, sim);
            expect(ent.pos.x).toBeGreaterThan(100); // Moved east
        });
    });

    describe('executeMoveTo', () => {
        it('should switch to drink state when near water', () => {
            const ent = createMockEntity('e1', 'rat');
            ent.state = 'moveTo';
            ent.ai.currentGoal = 'drink';

            // Mock water object at 100,100 (same pos)
            const waterObj = { id: 'w1', type: 'water', pos: { tx: 100 / V1.tileSizePx, ty: 100 / V1.tileSizePx } };

            const sim: any = {
                objects: new Map([['w1', waterObj]]),
                rng: () => 0.5
            };

            executeAction(ent, sim);
            expect(ent.state).toBe('drink');
        });

        it('should move towards water if far', () => {
            const ent = createMockEntity('e1', 'rat');
            ent.state = 'moveTo';
            ent.ai.currentGoal = 'drink';

            // Water far away
            const waterObj = { id: 'w1', type: 'water', pos: { tx: 500 / V1.tileSizePx, ty: 100 / V1.tileSizePx } };

            const sim: any = {
                objects: new Map([['w1', waterObj]]),
                rng: () => 0.5
            };

            executeAction(ent, sim);
            expect(ent.state).toBe('moveTo');
            expect(ent.pos.x).toBeGreaterThan(100); // Moved towards 500
        });
    });

    describe('executeDrink', () => {
        it('should restore thirst and log event', () => {
            const ent = createMockEntity('e1', 'rat');
            ent.state = 'drink';
            ent.vitals.thirst01 = 0.5;
            ent.targetObjectId = 'w1';

            const sim: any = {
                tick: 120,
                pendingEvents: [],
                rng: () => 0.5
            };

            executeAction(ent, sim);

            expect(ent.vitals.thirst01).toBeGreaterThan(0.5);
            expect(sim.pendingEvents).toHaveLength(1);
            expect(sim.pendingEvents[0].type).toBe('DRINK');
        });

        it('should finish drinking when full', () => {
            const ent = createMockEntity('e1', 'rat');
            ent.state = 'drink';
            ent.vitals.thirst01 = 0.99; // Almost full
            ent.targetObjectId = 'w1';

            const sim: any = { tick: 123, pendingEvents: [] };

            executeAction(ent, sim);
            expect(ent.state).toBe('idle'); // Should transition to idle
        });
    });

    describe('executeChase', () => {
        it('should move towards prey', () => {
            const cat = createMockEntity('c1', 'cat');
            cat.state = 'chase';
            cat.targetEntityId = 'r1';

            const rat = createMockEntity('r1', 'rat');
            rat.pos = { x: 500, y: 100 }; // Far away

            const sim: any = {
                entities: new Map([['c1', cat], ['r1', rat]]),
                rng: () => 0.5,
                rules: { ai: { chaseTimeoutTicks: 100 } }
            };

            executeAction(cat, sim);

            expect(cat.pos.x).toBeGreaterThan(100); // Moved east
            expect(cat.state).toBe('chase');
        });

        it('should attack when in range', () => {
            const cat = createMockEntity('c1', 'cat');
            cat.state = 'chase';
            cat.targetEntityId = 'r1';

            const rat = createMockEntity('r1', 'rat');
            rat.pos = { x: 105, y: 100 }; // Very close (5px)

            const sim: any = {
                entities: new Map([['c1', cat], ['r1', rat]]),
                pendingEvents: [],
                rng: () => 0.5,
                tick: 1
            };

            executeAction(cat, sim);
            expect(cat.state).toBe('attack');
            expect(sim.pendingEvents[0].type).toBe('HUNT');
        });
    });

    describe('executeAttack', () => {
        it('should damage prey', () => {
            const cat = createMockEntity('c1', 'cat');
            cat.state = 'attack';
            cat.targetEntityId = 'r1';

            const rat = createMockEntity('r1', 'rat');
            rat.vitals.health01 = 1.0;

            const sim: any = {
                entities: new Map([['c1', cat], ['r1', rat]]),
                pendingEvents: [],
                tick: 10
            };

            executeAction(cat, sim);

            expect(rat.vitals.health01).toBeLessThan(1.0);
            expect(cat.state).toBe('wander'); // Reset to wander after attack
        });

        it('should kill prey if health drops to 0 or killOnHit', () => {
            const cat = createMockEntity('c1', 'cat');
            cat.state = 'attack';
            cat.targetEntityId = 'r1';

            const rat = createMockEntity('r1', 'rat');
            rat.vitals.health01 = 0.1; // Low health, one hit kill likely

            const sim: any = {
                entities: new Map([['c1', cat], ['r1', rat]]),
                pendingEvents: [],
                tick: 10
            };

            executeAction(cat, sim);

            // Verify damage logic or kill logic depends on config
            // Default damage 0.3, so 0.1 - 0.3 < 0
            expect(rat.vitals.health01).toBe(0);
        });
    });

    describe('executeFlee', () => {
        it('should run away from predator', () => {
            const rat = createMockEntity('r1', 'rat');
            rat.state = 'flee';

            const cat = createMockEntity('c1', 'cat');
            cat.pos = { x: 80, y: 100 }; // West of Rat(100,100)

            const sim: any = {
                entities: new Map([['r1', rat], ['c1', cat]]),
                objects: new Map(),
                rules: { ai: { useCoverForRats: false } },
                rng: () => 0.5
            };

            executeAction(rat, sim);

            // Predator is West (80), Rat is (100). Rat should run East (>100)
            expect(rat.pos.x).toBeGreaterThan(100);
        });

        it('should run towards bush if cover enabled', () => {
            const rat = createMockEntity('r1', 'rat');
            rat.state = 'flee';

            const cat = createMockEntity('c1', 'cat');
            cat.pos = { x: 80, y: 100 }; // West

            // Bush at 90 (between them? No, unsafe. Bush at 150 East)
            const bush = { id: 'b1', type: 'bush', pos: { tx: 150 / V1.tileSizePx, ty: 100 / V1.tileSizePx } };

            const sim: any = {
                entities: new Map([['r1', rat], ['c1', cat]]),
                objects: new Map([['b1', bush]]),
                rules: { ai: { useCoverForRats: true } },
                rng: () => 0.5
            };

            executeAction(rat, sim);

            expect(rat.pos.x).toBeGreaterThan(100); // Moving towards bush
        });
    });
});

describe('Actions Helpers via Public API', () => {
    describe('findNearestPrey filtering', () => {
        it('should ignore dead entities', () => {
            const cat = createMockEntity('c1', 'cat');
            cat.state = 'chase';
            cat.targetEntityId = 'r1'; // Old target

            const rat = createMockEntity('r1', 'rat');
            rat.state = 'dead'; // Dead

            const sim: any = {
                entities: new Map([['c1', cat], ['r1', rat]]),
                pendingEvents: [],
                rng: () => 0.5,
                rules: { ai: { chaseTimeoutTicks: 100 } }
            };

            executeAction(cat, sim);
            expect(cat.state).toBe('wander');
            expect(cat.ai.lastFailReason).toBe('prey_lost');
        });

        it('should ignore non-prey species', () => {
            const cat = createMockEntity('c1', 'cat');
            cat.state = 'chase';
            cat.targetEntityId = 'r1'; // Old target (invalid/dead)

            // Old target is dead
            const ratCarcass = createMockEntity('r1', 'rat');
            ratCarcass.state = 'dead';

            // Nearby other cat (should be ignored)
            const cat2 = createMockEntity('c2', 'cat');
            cat2.pos = { x: 110, y: 100 };

            const sim: any = {
                entities: new Map([['c1', cat], ['r1', ratCarcass], ['c2', cat2]]),
                pendingEvents: [],
                rng: () => 0.5,
                rules: { ai: { chaseTimeoutTicks: 100 } }
            };

            executeAction(cat, sim);
            expect(cat.state).toBe('wander');
        });
    });

    describe('updateFacing', () => {
        it('should face east', () => {
            const ent = createMockEntity('e1', 'rat');
            ent.vel = { x: 5, y: 0 };
            executeAction(ent, { rng: () => 0.5 } as any); // executeAction calls updateFacing at end
            expect(ent.facing).toBe('e');
        });
        it('should face west', () => {
            const ent = createMockEntity('e1', 'rat');
            ent.vel = { x: -5, y: 0 };
            executeAction(ent, { rng: () => 0.5 } as any);
            expect(ent.facing).toBe('w');
        });
        it('should face south', () => {
            const ent = createMockEntity('e1', 'rat');
            ent.vel = { x: 0.1, y: 5 };
            executeAction(ent, { rng: () => 0.5 } as any);
            expect(ent.facing).toBe('s');
        });
        it('should face north', () => {
            const ent = createMockEntity('e1', 'rat');
            ent.vel = { x: 0.1, y: -5 };
            executeAction(ent, { rng: () => 0.5 } as any);
            expect(ent.facing).toBe('n');
        });
    });
});
