
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { DEFAULT_WORLD_RULES, SimEvent } from '@shared/types';

describe('gameStore', () => {
    beforeEach(() => {
        // Reset store state
        useGameStore.setState({
            initialized: false,
            tick: 0,
            entities: [],
            objects: [],
            stats: { timeOfDay: 0.25, rat: 0, cat: 0, chicken: 0, smallBird: 0, raccoon: 0, crow: 0, dog: 0, deathsLastMin: 0, birthsLastMin: 0 },
            events: [],
            rules: DEFAULT_WORLD_RULES,
        });
    });

    it('should initialize with empty events', () => {
        const state = useGameStore.getState();
        expect(state.events).toEqual([]);
    });

    it('should add new events from snapshot', () => {
        const { updateFromSnapshot } = useGameStore.getState();

        const snapshotEvents: SimEvent[] = [
            { type: 'DEATH', tick: 10, entityId: 'e1', reason: 'killed' }
        ];

        updateFromSnapshot({
            tick: 10,
            entities: [],
            objects: [],
            stats: { timeOfDay: 0.25, rat: 0, cat: 0, chicken: 0, smallBird: 0, raccoon: 0, crow: 0, dog: 0, deathsLastMin: 0, birthsLastMin: 0 },
            events: snapshotEvents
        });

        const state = useGameStore.getState();
        expect(state.events).toHaveLength(1);
        expect(state.events[0].type).toBe('DEATH');
    });

    it('should merge events and keep only last 50', () => {
        const { updateFromSnapshot } = useGameStore.getState();

        // 1. Add 30 events
        const batch1: SimEvent[] = Array(30).fill(null).map((_, i) => ({
            type: 'DRINK', tick: i, entityId: `e${i}`, waterId: 'w1'
        }));

        updateFromSnapshot({
            tick: 30,
            entities: [],
            objects: [],
            stats: { timeOfDay: 0.25, rat: 0, cat: 0, chicken: 0, smallBird: 0, raccoon: 0, crow: 0, dog: 0, deathsLastMin: 0, birthsLastMin: 0 },
            events: batch1
        });

        expect(useGameStore.getState().events).toHaveLength(30);

        // 2. Add 30 more events (Total 60, should cap at 50)
        const batch2: SimEvent[] = Array(30).fill(null).map((_, i) => ({
            type: 'EAT', tick: 30 + i, entityId: `e${30 + i}`, source: 'trash'
        }));

        updateFromSnapshot({
            tick: 60,
            entities: [],
            objects: [],
            stats: { timeOfDay: 0.25, rat: 0, cat: 0, chicken: 0, smallBird: 0, raccoon: 0, crow: 0, dog: 0, deathsLastMin: 0, birthsLastMin: 0 },
            events: batch2
        });

        const state = useGameStore.getState();
        expect(state.events).toHaveLength(50);
        // Should contain last 20 from batch1 and all 30 from batch2?
        // Logic: [...old, ...new].slice(-50)
        // batch1 (30) + batch2 (30) = 60. slice(-50) means index 10 to 59.
        // Index 0-29 are batch1. Index 30-59 are batch2.
        // So we strip indices 0-9 (first 10 of batch1).
        // First event should be batch1[10] (tick 10)
        expect(state.events[0].tick).toBe(10);
        expect(state.events[49].tick).toBe(59);
    });
});
