// ============================================
// V1 物种配置 - 完整规格
// ============================================

import type { Personality, SpeciesId, Goal } from '../../shared/types';

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
        water: number;  // per tile
        bush: number;
        prey: number;
        trash: number;
    };
    personality: Record<
        Personality,
        Partial<UtilityWeights['urgency'] & UtilityWeights['bonuses']>
    >;
};

// ============================================
// 物种配置类型
// ============================================

export type SpeciesConfig = {
    id: SpeciesId;

    move: {
        speedTilesPerTick: number;
        wanderJitter: number;       // 0..1
        turnSmooth: number;         // 0..1
    };

    sense: {
        radiusTiles: number;
    };

    vitals: {
        // decay per tick (multiplied by timeScale)
        hungerDecayPerTick: number;
        thirstDecayPerTick: number;
        fatigueDecayPerTick: number;

        // gains per tick while performing action
        drinkGainPerTick: number;
        eatGainPerTick: number;
        sleepGainPerTick: number;

        // thresholds & damage
        dangerThreshold01: number;      // e.g. 0.15
        healthDamageWhenHungerBelow: number;
        healthDamageWhenThirstBelow: number;
    };

    combat?: {
        attackRangeTiles: number;
        attackCooldownTicks: number;
        killOnHit: boolean;
    };

    utility: UtilityWeights;
};

// ============================================
// 🐭 鼠 (Rat) 配置
// ============================================

export const RAT_SPECIES: SpeciesConfig = {
    id: 'rat',

    move: {
        speedTilesPerTick: 0.07,
        wanderJitter: 0.6,
        turnSmooth: 0.35,
    },

    sense: {
        radiusTiles: 10,
    },

    vitals: {
        hungerDecayPerTick: 0.0006,
        thirstDecayPerTick: 0.0008,
        fatigueDecayPerTick: 0.0005,

        drinkGainPerTick: 0.01,
        eatGainPerTick: 0.008,
        sleepGainPerTick: 0.006,

        dangerThreshold01: 0.15,
        healthDamageWhenHungerBelow: 0.0008,
        healthDamageWhenThirstBelow: 0.0012,
    },

    utility: {
        base: {
            flee: 0.2,
            drink: 0.05,
            eat: 0.05,
            rest: 0.02,
            wander: 0.01,
            hunt: -999,     // 鼠永远不捕猎
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
            brave: { fear: -0.25, nearTrash: 0.1 },
            curious: { nearTrash: 0.1, nearWater: 0.05 },
        },
    },
};

// ============================================
// 🐱 猫 (Cat) 配置
// ============================================

export const CAT_SPECIES: SpeciesConfig = {
    id: 'cat',

    move: {
        speedTilesPerTick: 0.06,
        wanderJitter: 0.45,
        turnSmooth: 0.3,
    },

    sense: {
        radiusTiles: 12,
    },

    vitals: {
        hungerDecayPerTick: 0.0007,
        thirstDecayPerTick: 0.0007,
        fatigueDecayPerTick: 0.00045,

        drinkGainPerTick: 0.01,
        eatGainPerTick: 0.014,
        sleepGainPerTick: 0.006,

        dangerThreshold01: 0.15,
        healthDamageWhenHungerBelow: 0.0009,
        healthDamageWhenThirstBelow: 0.001,
    },

    combat: {
        attackRangeTiles: 0.6,
        attackCooldownTicks: 10,
        killOnHit: true,
    },

    utility: {
        base: {
            hunt: 0.08,
            drink: 0.06,
            rest: 0.03,
            wander: 0.01,
            eat: 0.0,       // 猫 V1 不吃垃圾，从猎物获取食物
            flee: -999,     // 猫永远不逃跑
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
            brave: { seesPrey: 0.15, hunger: 0.1 },
            cautious: { seesPrey: -0.1, thirst: 0.05 },
            curious: { nearTrash: 0.08 },
        },
    },
};

// ============================================
// 物种配置映射
// ============================================

export const SPECIES: Record<SpeciesId, SpeciesConfig> = {
    rat: RAT_SPECIES,
    cat: CAT_SPECIES,
} as const;

// ============================================
// 辅助函数
// ============================================

export function getSpeciesConfig(species: SpeciesId): SpeciesConfig {
    return SPECIES[species];
}
