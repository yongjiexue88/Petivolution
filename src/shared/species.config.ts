// ============================================
// V1 物种配置 (数据驱动)
// ============================================

import type { SpeciesId, Goal, Personality } from './types';

// ============================================
// Utility 权重类型
// ============================================

export type UtilityWeights = {
    base: Record<Goal, number>;
    urgency: {
        hunger: number;
        thirst: number;
        fatigue: number;
        fear: number;
    };
    bonuses: {
        seesPrey: number;
        nearTrash: number;
        nearWater: number;
        nearBush: number;
    };
    distancePenalty: {
        water: number;
        bush: number;
        prey: number;
        trash: number;
    };
    personality: Record<Personality, Partial<UtilityWeights['bonuses'] & UtilityWeights['urgency']>>;
};

// ============================================
// 物种配置类型
// ============================================

export type SpeciesConfig = {
    id: SpeciesId;

    move: {
        speedTilesPerTick: number;
        wanderJitter: number;
        turnSmooth: number;
    };

    sense: {
        radiusTiles: number;
    };

    vitals: {
        // 每tick下降量
        hungerDecayPerTick: number;
        thirstDecayPerTick: number;
        fatigueDecayPerTick: number;

        // 恢复量
        drinkGainPerTick: number;
        eatGainPerTick: number;
        sleepGainPerTick: number;

        // 伤害阈值
        dangerThreshold01: number;
        healthDamageWhenHungerBelow: number;
        healthDamageWhenThirstBelow: number;
    };

    combat?: {
        attackRangeTiles: number;
        attackCooldownTicks: number;
        killOnHit: boolean;
        damagePerHit: number;
    };

    // V2 Reproduction
    reproduction?: {
        enabled: boolean;
        minHunger: number; // 0..1, must be above to reproduce
        minAgeTicks: number;
        cooldownTicks: number;
        energyCost: number; // Hunger penalty
        maxPopulation: number; // Simple cap
        probabilityPerSecond: number; // Random chance if conditions met
    };

    utility: UtilityWeights;

    // 视觉
    spriteKey: string;
    spriteColor: number;
};

// ============================================
// 🐭 鼠 (Rat) 配置
// ============================================

export const RAT_CONFIG: SpeciesConfig = {
    id: 'rat',

    move: {
        speedTilesPerTick: 0.07,
        wanderJitter: 0.3,
        turnSmooth: 0.8,
    },

    sense: {
        radiusTiles: 10,
    },

    vitals: {
        hungerDecayPerTick: 0.0006,   // ~111s 饿死
        thirstDecayPerTick: 0.0008,   // ~83s 渴死
        fatigueDecayPerTick: 0.0005,

        drinkGainPerTick: 0.010,      // ~2s 喝满
        eatGainPerTick: 0.008,
        sleepGainPerTick: 0.006,

        dangerThreshold01: 0.15,
        healthDamageWhenHungerBelow: 0.0008,
        healthDamageWhenThirstBelow: 0.0012,
    },

    reproduction: {
        enabled: true,
        minHunger: 0.7,
        minAgeTicks: 300,  // ~5s (Fast enough for testing)
        cooldownTicks: 600, // ~10s
        energyCost: 0.25,
        maxPopulation: 100,
        probabilityPerSecond: 0.2, // Check every second, 20% chance
    },

    utility: {
        base: {
            flee: 0.2,
            drink: 0.05,
            eat: 0.05,
            rest: 0.02,
            wander: 0.01,
            hunt: -999,  // 鼠不捕猎
        },

        urgency: {
            fear: 2.8,
            thirst: 1.4,
            hunger: 1.0,
            fatigue: 0.6,
        },

        bonuses: {
            nearBush: 0.35,
            nearWater: 0.15,
            nearTrash: 0.22,
            seesPrey: 0,
        },

        distancePenalty: {
            bush: 0.06,
            water: 0.04,
            trash: 0.03,
            prey: 0,
        },

        personality: {
            cautious: { fear: 0.4, nearBush: 0.15 },
            brave: { fear: -0.25, nearTrash: 0.10 },
            curious: { nearTrash: 0.10, nearWater: 0.05 },
        },
    },

    spriteKey: 'rat',
    spriteColor: 0x808080,
};

// ============================================
// 🐱 猫 (Cat) 配置
// ============================================

export const CAT_CONFIG: SpeciesConfig = {
    id: 'cat',

    move: {
        speedTilesPerTick: 0.06,
        wanderJitter: 0.2,
        turnSmooth: 0.85,
    },

    sense: {
        radiusTiles: 12,
    },

    vitals: {
        hungerDecayPerTick: 0.0007,
        thirstDecayPerTick: 0.0007,
        fatigueDecayPerTick: 0.00045,

        drinkGainPerTick: 0.010,
        eatGainPerTick: 0.014,       // 吃鼠恢复明显
        sleepGainPerTick: 0.006,

        dangerThreshold01: 0.15,
        healthDamageWhenHungerBelow: 0.0009,
        healthDamageWhenThirstBelow: 0.0010,
    },

    combat: {
        attackRangeTiles: 0.6,
        attackCooldownTicks: 10,     // ~0.66s
        killOnHit: true,             // V1猫抓鼠直接死
        damagePerHit: 1.0,
    },

    utility: {
        base: {
            hunt: 0.08,
            drink: 0.06,
            rest: 0.03,
            wander: 0.01,
            eat: 0.0,
            flee: -999,  // 猫不逃跑
        },

        urgency: {
            hunger: 1.5,
            thirst: 1.7,
            fatigue: 0.7,
            fear: 0.0,
        },

        bonuses: {
            seesPrey: 0.55,
            nearWater: 0.18,
            nearTrash: 0.08,
            nearBush: 0.02,
        },

        distancePenalty: {
            prey: 0.05,
            water: 0.04,
            trash: 0.03,
            bush: 0.0,
        },

        personality: {
            brave: { seesPrey: 0.15, hunger: 0.10 },
            cautious: { seesPrey: -0.10, thirst: 0.05 },
            curious: { nearTrash: 0.08 },
        },
    },

    spriteKey: 'cat',
    spriteColor: 0xffa500,
};

// ============================================
// 物种配置映射
// ============================================

export const SPECIES_CONFIGS: Record<SpeciesId, SpeciesConfig> = {
    rat: RAT_CONFIG,
    cat: CAT_CONFIG,
};

// ============================================
// 世界对象配置
// ============================================

export type ObjectConfig = {
    type: string;
    maxResources: number;
    regenRate: number;
    interactRangeTiles: number;
    strengthDefault: number;
    spriteKey: string;
};

export const OBJECT_CONFIGS: Record<string, ObjectConfig> = {
    water: {
        type: 'water',
        maxResources: 100,
        regenRate: 0.5,
        interactRangeTiles: 1.5,
        strengthDefault: 1.0,
        spriteKey: 'water_source',
    },
    bush: {
        type: 'bush',
        maxResources: 0,
        regenRate: 0,
        interactRangeTiles: 2.0,
        strengthDefault: 0.8,
        spriteKey: 'bush',
    },
    trash: {
        type: 'trash',
        maxResources: 80,
        regenRate: 0.2,
        interactRangeTiles: 1.5,
        strengthDefault: 1.0,
        spriteKey: 'trash_pile',
    },
};

// ============================================
// 辅助函数
// ============================================

export function getSpeciesConfig(species: SpeciesId): SpeciesConfig {
    return SPECIES_CONFIGS[species];
}

export function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}
