
import { describe, it, expect } from 'vitest';
import { SPECIES_CONFIGS, OBJECT_CONFIGS, clamp01 } from './species.config';

describe('Shared Configs', () => {
    describe('SPECIES_CONFIGS', () => {
        it('should have rat config', () => {
            expect(SPECIES_CONFIGS.rat).toBeDefined();
            expect(SPECIES_CONFIGS.rat.vitals.hungerDecayPerTick).toBeGreaterThan(0);
        });

        it('should have cat config', () => {
            expect(SPECIES_CONFIGS.cat).toBeDefined();
            expect(SPECIES_CONFIGS.cat.move.speedTilesPerTick).toBeGreaterThan(0);
        });

        it('should have valid utility weights', () => {
            const utility = SPECIES_CONFIGS.rat.utility;
            expect(utility.urgency.thirst).toBeGreaterThanOrEqual(0);
            expect(utility.urgency.hunger).toBeGreaterThanOrEqual(0);
            expect(utility.urgency.fatigue).toBeGreaterThanOrEqual(0);
        });
    });

    describe('OBJECT_CONFIGS', () => {
        it('should have water config', () => {
            expect(OBJECT_CONFIGS.water).toBeDefined();
            expect(OBJECT_CONFIGS.water.interactRangeTiles).toBeGreaterThan(0);
        });

        it('should have bush config', () => {
            expect(OBJECT_CONFIGS.bush).toBeDefined();
        });

        it('should have trash config', () => {
            expect(OBJECT_CONFIGS.trash).toBeDefined();
        });
    });

    describe('clamp01', () => {
        it('should clamp values between 0 and 1', () => {
            expect(clamp01(-0.1)).toBe(0);
            expect(clamp01(0)).toBe(0);
            expect(clamp01(0.5)).toBe(0.5);
            expect(clamp01(1)).toBe(1);
            expect(clamp01(1.1)).toBe(1);
        });
    });
});
