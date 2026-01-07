
import { describe, it, expect } from 'vitest';
import { distance, normalize, perceive } from './perception';
import { V1 } from '@shared/constants';

describe('Perception System', () => {
    describe('Math Helpers', () => {
        it('distance should calculate euclidean distance', () => {
            const d = distance({ x: 0, y: 0 }, { x: 3, y: 4 });
            expect(d).toBe(5);
        });

        it('normalize should return unit vector', () => {
            const v = normalize({ x: 10, y: 0 });
            expect(v.x).toBe(1);
            expect(v.y).toBe(0);
        });

        it('normalize zero vector returns zero', () => {
            const v = normalize({ x: 0, y: 0 });
            expect(v.x).toBe(0);
            expect(v.y).toBe(0);
        });
    });

    describe('perceive', () => {
        // Mock helper
        function createEntity(id: string, species: 'rat' | 'cat', x: number): any {
            return {
                id, species, state: 'idle',
                pos: { x, y: 0 },
            };
        }

        function createObject(id: string, type: string, x: number): any {
            return {
                id, type,
                pos: { tx: x / V1.tileSizePx, ty: 0 }
            };
        }

        it('should detect nearby entities within sense radius', () => {
            const me = createEntity('me', 'rat', 0);
            const cat = createEntity('cat1', 'cat', 100); // 100px away. Rat sense is 320px (10 tiles)

            const entities = new Map();
            entities.set('me', me);
            entities.set('cat1', cat);

            const sim: any = {
                entities,
                objects: new Map()
            };

            const result = perceive(me, sim);
            expect(result.nearestPredator).toBeDefined();
            expect(result.nearestPredator?.entityId).toBe('cat1');
            expect(result.stimuli).toHaveLength(1);
        });

        it('should NOT detect entities outside sense radius', () => {
            const me = createEntity('me', 'rat', 0);
            const cat = createEntity('cat1', 'cat', 500); // 500px > 320px

            const entities = new Map();
            entities.set('me', me);
            entities.set('cat1', cat);

            const sim: any = {
                entities,
                objects: new Map()
            };

            const result = perceive(me, sim);
            expect(result.nearestPredator).toBeNull();
            expect(result.stimuli).toHaveLength(0);
        });

        it('should detect nearest object', () => {
            const me = createEntity('me', 'rat', 0);
            const trash1 = createObject('t1', 'trash', 100);
            const trash2 = createObject('t2', 'trash', 50); // Closer

            const objects = new Map();
            objects.set('t1', trash1);
            objects.set('t2', trash2);

            const sim: any = {
                entities: new Map([['me', me]]),
                objects
            };

            const result = perceive(me, sim);
            expect(result.nearestTrash).toBeDefined();
            expect(result.nearestTrash?.objectId).toBe('t2');
            expect(result.nearestTrash?.dist).toBe(50);
        });
    });
});
