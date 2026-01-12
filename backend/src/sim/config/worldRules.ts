// ============================================
// V1 World Rules Configuration
// ============================================

import type { WorldRule } from '../../shared/types';

// ============================================
// Default Rules
// ============================================

export const DEFAULT_RULES: WorldRule = {
    timeScale: 1,

    capsEnabled: true,
    capPerChunk: {
        rat: 20,
        cat: 6,
        chicken: 10,
        smallBird: 15,
        raccoon: 5,
        crow: 10,
        dog: 2,
        fox: 3,
        hawk: 2,
        wolf: 4,
        snake: 5
    },

    trashSpawnsRats: true,
    ratSpawn: {
        enabled: true,
        // tick=15Hz: 120 ticks ≈ 8 seconds
        perTrashEveryTicks: 120,
        probability: 0.35,
        minRatsNearbyToStop: 8,
        maxRatsNearby: 12,
    },

    deathEnabled: true,

    ai: {
        perceptionEnabled: true,
        useCoverForRats: true,
        // tick=15Hz: 150 ticks ≈ 10 seconds
        chaseTimeoutTicks: 150,
    },

    debug: {
        showSenseRadius: false,
        showTargets: false,
        showPaths: false,
        showChunkBounds: false,
    },
};

// ============================================
// Preset Rules (Ecosystem Tiers)
// ============================================

export const RULE_PRESETS: Record<'balanced' | 'wild' | 'abundant' | 'chaos' | 'challenge_backyard', WorldRule> = {
    // Balanced Mode: Default settings
    balanced: { ...DEFAULT_RULES },

    // Wild Mode: More rats, more cats
    wild: {
        ...DEFAULT_RULES,
        ratSpawn: {
            ...DEFAULT_RULES.ratSpawn,
            probability: 0.55,
        },
        capPerChunk: {
            rat: 20,
            cat: 6,
            chicken: 10,
            smallBird: 15,
            raccoon: 5,
            crow: 10,
            dog: 2,
            fox: 4,
            hawk: 3,
            wolf: 5,
            snake: 6
        },
    },

    // Abundant Mode: Fewer rat spawns, more stable
    abundant: {
        ...DEFAULT_RULES,
        ratSpawn: {
            ...DEFAULT_RULES.ratSpawn,
            probability: 0.25,
        },
        capPerChunk: {
            rat: 16,
            cat: 6,
            chicken: 10,
            smallBird: 15,
            raccoon: 4,
            crow: 8,
            dog: 2,
            fox: 3,
            hawk: 2,
            wolf: 3,
            snake: 4
        },
    },

    // Chaos Mode: Lots of rats, lots of cats, high reproduction rate
    chaos: {
        ...DEFAULT_RULES,
        ratSpawn: {
            ...DEFAULT_RULES.ratSpawn,
            probability: 0.75, // Higher reproduction probability
            minRatsNearbyToStop: 15, // More rats needed to stop spawning
            maxRatsNearby: 20, // Allows more rats
        },
        capPerChunk: {
            rat: 50,
            cat: 10,
            chicken: 20,
            smallBird: 30,
            raccoon: 10,
            crow: 20,
            dog: 5,
            fox: 10,
            hawk: 5,
            wolf: 8,
            snake: 10
        },
        timeScale: 2, // Faster time flow
        ai: {
            ...DEFAULT_RULES.ai,
            chaseTimeoutTicks: 60, // Crazy chase
        },
    },

    // Challenge: Backyard Balance
    challenge_backyard: {
        ...DEFAULT_RULES,
        trashSpawnsRats: true,
        ratSpawn: {
            ...DEFAULT_RULES.ratSpawn,
            probability: 0.4,
        },
        capPerChunk: {
            rat: 20,
            cat: 6,
            chicken: 10,
            smallBird: 15,
            raccoon: 5,
            crow: 10,
            dog: 2,
            fox: 3,
            hawk: 2,
            wolf: 4,
            snake: 5
        },
        challenge: {
            enabled: true,
            title: 'Backyard Harmony',
            description: 'Maintain Chicken & Bird population > 5 for 2 minutes while keeping Rats < 30.',
            targetDurationTicks: 15 * 120, // 2 minutes
            minPopulation: {
                chicken: 5,
                smallBird: 5,
            },
            maxPopulation: {
                rat: 30,
            },
        },
    },
};

// ============================================
// Helper Functions
// ============================================

export function getRulePreset(preset: keyof typeof RULE_PRESETS): WorldRule {
    return { ...RULE_PRESETS[preset] };
}

export function mergeRules(base: WorldRule, partial: Partial<WorldRule>): WorldRule {
    return {
        ...base,
        ...partial,
        capPerChunk: {
            ...base.capPerChunk,
            ...(partial.capPerChunk ?? {}),
        },
        ratSpawn: {
            ...base.ratSpawn,
            ...(partial.ratSpawn ?? {}),
        },
        ai: {
            ...base.ai,
            ...(partial.ai ?? {}),
        },
        debug: {
            ...base.debug,
            ...(partial.debug ?? {}),
        },
    };
}
