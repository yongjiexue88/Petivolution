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
        nearIntruder?: number; // Dog-specific
    };
    distancePenalty: {
        water: number;  // per tile
        bush: number;
        prey: number;
        trash: number;
    };
    personality: Record<
        Personality,
        Partial<UtilityWeights['urgency'] & UtilityWeights['bonuses'] & UtilityWeights['base']>
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
            rummage: -999,
            forage: -999,
            bark: -999,
            patrol: -999,
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
            rummage: -999,
            forage: -999,
            bark: -999,
            patrol: -999,
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
// 🐔 鸡 (Chicken) 配置
// ============================================
export const CHICKEN_SPECIES: SpeciesConfig = {
    id: 'chicken',
    move: { speedTilesPerTick: 0.05, wanderJitter: 0.7, turnSmooth: 0.4 },
    sense: { radiusTiles: 8 },
    vitals: {
        hungerDecayPerTick: 0.0005, thirstDecayPerTick: 0.0006, fatigueDecayPerTick: 0.0004,
        drinkGainPerTick: 0.01, eatGainPerTick: 0.01, sleepGainPerTick: 0.006,
        dangerThreshold01: 0.15, healthDamageWhenHungerBelow: 0.0008, healthDamageWhenThirstBelow: 0.001,
    },
    utility: {
        base: {
            flee: 0.3, drink: 0.05, eat: 0.05, rest: 0.02, wander: 0.01,
            hunt: -999, rummage: -999, forage: 0.08, bark: -999, patrol: -999,
        },
        urgency: { fear: 2.5, hunger: 1.0, thirst: 1.2, fatigue: 0.6 },
        bonuses: { nearBush: 0.2, nearWater: 0.1, nearTrash: 0.1, seesPrey: 0 },
        distancePenalty: { bush: 0.05, water: 0.04, trash: 0.03, prey: 0 },
        personality: {
            cautious: { fear: 0.5 }, brave: { fear: -0.2 }, curious: { nearTrash: 0.1 }
        }
    }
};

// ============================================
// 🐦 小鸟 (SmallBird) 配置
// ============================================
export const SMALL_BIRD_SPECIES: SpeciesConfig = {
    id: 'smallBird',
    move: { speedTilesPerTick: 0.08, wanderJitter: 0.8, turnSmooth: 0.5 },
    sense: { radiusTiles: 12 },
    vitals: {
        hungerDecayPerTick: 0.0004, thirstDecayPerTick: 0.0005, fatigueDecayPerTick: 0.0003,
        drinkGainPerTick: 0.01, eatGainPerTick: 0.005, sleepGainPerTick: 0.008,
        dangerThreshold01: 0.15, healthDamageWhenHungerBelow: 0.001, healthDamageWhenThirstBelow: 0.001,
    },
    utility: {
        base: {
            flee: 0.4, drink: 0.04, eat: 0.04, rest: 0.03, wander: 0.02,
            hunt: -999, rummage: -999, forage: 0.06, bark: -999, patrol: -999,
        },
        urgency: { fear: 3.0, hunger: 1.0, thirst: 1.0, fatigue: 0.5 },
        bonuses: { nearBush: 0.3, nearWater: 0.1, nearTrash: 0.05, seesPrey: 0 },
        distancePenalty: { bush: 0.04, water: 0.04, trash: 0.04, prey: 0 },
        personality: {
            cautious: { fear: 0.5 }, brave: { fear: -0.1 }, curious: { wander: 0.05 }
        }
    }
};

// ============================================
// 🦝 浣熊 (Raccoon) 配置
// ============================================
export const RACCOON_SPECIES: SpeciesConfig = {
    id: 'raccoon',
    move: { speedTilesPerTick: 0.06, wanderJitter: 0.5, turnSmooth: 0.3 },
    sense: { radiusTiles: 10 },
    vitals: {
        hungerDecayPerTick: 0.0007, thirstDecayPerTick: 0.0007, fatigueDecayPerTick: 0.0005,
        drinkGainPerTick: 0.01, eatGainPerTick: 0.015, sleepGainPerTick: 0.006,
        dangerThreshold01: 0.15, healthDamageWhenHungerBelow: 0.0009, healthDamageWhenThirstBelow: 0.001,
    },
    utility: {
        base: {
            flee: 0.1, drink: 0.05, eat: 0.0, rest: 0.02, wander: 0.01,
            hunt: -999, rummage: 0.1, forage: -999, bark: -999, patrol: -999,
        },
        urgency: { fear: 1.5, hunger: 1.2, thirst: 1.4, fatigue: 0.7 },
        bonuses: { nearBush: 0.1, nearWater: 0.1, nearTrash: 0.3, seesPrey: 0 },
        distancePenalty: { bush: 0.05, water: 0.04, trash: 0.02, prey: 0 },
        personality: {
            cautious: { fear: 0.3 }, brave: { nearTrash: 0.2 }, curious: { nearTrash: 0.1 }
        }
    }
};

// ============================================
// 🦅 乌鸦 (Crow) 配置
// ============================================
export const CROW_SPECIES: SpeciesConfig = {
    id: 'crow',
    move: { speedTilesPerTick: 0.07, wanderJitter: 0.6, turnSmooth: 0.4 },
    sense: { radiusTiles: 14 },
    vitals: {
        hungerDecayPerTick: 0.0005, thirstDecayPerTick: 0.0006, fatigueDecayPerTick: 0.0004,
        drinkGainPerTick: 0.01, eatGainPerTick: 0.01, sleepGainPerTick: 0.007,
        dangerThreshold01: 0.15, healthDamageWhenHungerBelow: 0.0008, healthDamageWhenThirstBelow: 0.001,
    },
    utility: {
        base: {
            flee: 0.2, drink: 0.05, eat: 0.05, rest: 0.02, wander: 0.02,
            hunt: -999, rummage: -999, forage: 0.07, bark: -999, patrol: -999,
        },
        urgency: { fear: 2.0, hunger: 1.1, thirst: 1.1, fatigue: 0.6 },
        bonuses: { nearBush: 0.1, nearWater: 0.1, nearTrash: 0.2, seesPrey: 0 },
        distancePenalty: { bush: 0.04, water: 0.04, trash: 0.03, prey: 0 },
        personality: {
            cautious: { fear: 0.4 }, brave: { nearTrash: 0.15 }, curious: { wander: 0.05 }
        }
    }
};

// ============================================
// 🐶 狗 (Dog) 配置
// ============================================
export const DOG_SPECIES: SpeciesConfig = {
    id: 'dog',
    move: { speedTilesPerTick: 0.065, wanderJitter: 0.5, turnSmooth: 0.35 },
    sense: { radiusTiles: 12 },
    vitals: {
        hungerDecayPerTick: 0.0008, thirstDecayPerTick: 0.0008, fatigueDecayPerTick: 0.0005,
        drinkGainPerTick: 0.015, eatGainPerTick: 0.02, sleepGainPerTick: 0.006,
        dangerThreshold01: 0.15, healthDamageWhenHungerBelow: 0.0009, healthDamageWhenThirstBelow: 0.001,
    },
    combat: { attackRangeTiles: 0.8, attackCooldownTicks: 15, killOnHit: false },
    utility: {
        base: {
            flee: -999, drink: 0.06, eat: 0.04, rest: 0.03, wander: 0.01,
            hunt: 0.05, rummage: -999, forage: -999, bark: 0.1, patrol: 0.08,
        },
        urgency: { fear: 0.0, hunger: 1.4, thirst: 1.6, fatigue: 0.7 },
        bonuses: { nearBush: 0.1, nearWater: 0.2, nearTrash: 0.1, seesPrey: 0.4, nearIntruder: 1.0 },
        distancePenalty: { bush: 0.05, water: 0.04, trash: 0.04, prey: 0.04 },
        personality: {
            cautious: { hunt: -0.1 }, brave: { hunt: 0.2 }, curious: { wander: 0.1 }
        }
    }
};

// ============================================
// 🦊 狐狸 (Fox) 配置
// ============================================
export const FOX_SPECIES: SpeciesConfig = {
    id: 'fox',
    move: { speedTilesPerTick: 0.07, wanderJitter: 0.45, turnSmooth: 0.35 },
    sense: { radiusTiles: 14 },
    vitals: {
        hungerDecayPerTick: 0.0007, thirstDecayPerTick: 0.0007, fatigueDecayPerTick: 0.0005,
        drinkGainPerTick: 0.01, eatGainPerTick: 0.015, sleepGainPerTick: 0.006,
        dangerThreshold01: 0.15, healthDamageWhenHungerBelow: 0.0009, healthDamageWhenThirstBelow: 0.001,
    },
    combat: { attackRangeTiles: 0.7, attackCooldownTicks: 12, killOnHit: true },
    utility: {
        base: {
            flee: 0.1, drink: 0.06, eat: 0.0, rest: 0.03, wander: 0.01,
            hunt: 0.1, rummage: -999, forage: -999, bark: -999, patrol: -999,
        },
        urgency: { fear: 1.0, hunger: 1.5, thirst: 1.6, fatigue: 0.7 },
        bonuses: { nearBush: 0.2, nearWater: 0.15, nearTrash: 0.05, seesPrey: 0.6 },
        distancePenalty: { bush: 0.04, water: 0.04, trash: 0.04, prey: 0.03 },
        personality: {
            cautious: { fear: 0.3 }, brave: { hunt: 0.15 }, curious: { wander: 0.05 }
        }
    }
};

// ============================================
// 🐺 狼 (Wolf) 配置
// ============================================
export const WOLF_SPECIES: SpeciesConfig = {
    id: 'wolf',
    move: { speedTilesPerTick: 0.075, wanderJitter: 0.5, turnSmooth: 0.4 },
    sense: { radiusTiles: 16 },
    vitals: {
        hungerDecayPerTick: 0.0009, thirstDecayPerTick: 0.0009, fatigueDecayPerTick: 0.0006,
        drinkGainPerTick: 0.02, eatGainPerTick: 0.025, sleepGainPerTick: 0.005,
        dangerThreshold01: 0.15, healthDamageWhenHungerBelow: 0.001, healthDamageWhenThirstBelow: 0.001,
    },
    combat: { attackRangeTiles: 0.8, attackCooldownTicks: 20, killOnHit: true },
    utility: {
        base: {
            flee: -999, drink: 0.06, eat: 0.0, rest: 0.03, wander: 0.01,
            hunt: 0.15, rummage: -999, forage: -999, bark: -999, patrol: -999,
        },
        urgency: { fear: 0.0, hunger: 1.6, thirst: 1.5, fatigue: 0.6 },
        bonuses: { nearBush: 0.1, nearWater: 0.15, nearTrash: 0.0, seesPrey: 0.7 },
        distancePenalty: { bush: 0.04, water: 0.04, trash: 0.0, prey: 0.04 },
        personality: {
            cautious: { hunt: 0.1 }, brave: { hunt: 0.3 }, curious: { wander: 0.1 }
        }
    }
};

// ============================================
// 🦅 鹰 (Hawk) 配置
// ============================================
export const HAWK_SPECIES: SpeciesConfig = {
    id: 'hawk',
    move: { speedTilesPerTick: 0.12, wanderJitter: 0.9, turnSmooth: 0.7 },
    sense: { radiusTiles: 20 },
    vitals: {
        hungerDecayPerTick: 0.0008, thirstDecayPerTick: 0.0008, fatigueDecayPerTick: 0.0006,
        drinkGainPerTick: 0.01, eatGainPerTick: 0.02, sleepGainPerTick: 0.005,
        dangerThreshold01: 0.15, healthDamageWhenHungerBelow: 0.001, healthDamageWhenThirstBelow: 0.001,
    },
    combat: { attackRangeTiles: 1.5, attackCooldownTicks: 15, killOnHit: true },
    utility: {
        base: {
            flee: 0.1, drink: 0.05, eat: 0.0, rest: 0.02, wander: 0.03,
            hunt: 0.2, rummage: -999, forage: -999, bark: -999, patrol: -999,
        },
        urgency: { fear: 1.0, hunger: 1.8, thirst: 1.4, fatigue: 0.8 },
        bonuses: { nearBush: 0.0, nearWater: 0.1, nearTrash: 0.0, seesPrey: 0.8 },
        distancePenalty: { bush: 0.0, water: 0.02, trash: 0.0, prey: 0.02 },
        personality: {
            cautious: { hunt: 0.1 }, brave: { hunt: 0.4 }, curious: { wander: 0.2 }
        }
    }
};

// ============================================
// 🐍 蛇 (Snake) 配置
// ============================================
export const SNAKE_SPECIES: SpeciesConfig = {
    id: 'snake',
    move: { speedTilesPerTick: 0.04, wanderJitter: 0.3, turnSmooth: 0.2 },
    sense: { radiusTiles: 8 },
    vitals: {
        hungerDecayPerTick: 0.0003, thirstDecayPerTick: 0.0003, fatigueDecayPerTick: 0.0002,
        drinkGainPerTick: 0.01, eatGainPerTick: 0.03, sleepGainPerTick: 0.009,
        dangerThreshold01: 0.15, healthDamageWhenHungerBelow: 0.0005, healthDamageWhenThirstBelow: 0.0005,
    },
    combat: { attackRangeTiles: 0.5, attackCooldownTicks: 30, killOnHit: true },
    utility: {
        base: {
            flee: 0.1, drink: 0.04, eat: 0.0, rest: 0.04, wander: 0.01,
            hunt: 0.1, rummage: -999, forage: -999, bark: -999, patrol: -999,
        },
        urgency: { fear: 0.5, hunger: 1.3, thirst: 1.0, fatigue: 0.4 },
        bonuses: { nearBush: 0.4, nearWater: 0.1, nearTrash: 0.1, seesPrey: 0.5 },
        distancePenalty: { bush: 0.05, water: 0.04, trash: 0.03, prey: 0.06 },
        personality: {
            cautious: { nearBush: 0.5 }, brave: { hunt: 0.2 }, curious: { wander: 0.05 }
        }
    }
};

// ============================================
// 物种配置映射
// ============================================

export const SPECIES: Record<SpeciesId, SpeciesConfig> = {
    rat: RAT_SPECIES,
    cat: CAT_SPECIES,
    chicken: CHICKEN_SPECIES,
    smallBird: SMALL_BIRD_SPECIES,
    raccoon: RACCOON_SPECIES,
    crow: CROW_SPECIES,
    dog: DOG_SPECIES,
    fox: FOX_SPECIES,
    wolf: WOLF_SPECIES,
    hawk: HAWK_SPECIES,
    snake: SNAKE_SPECIES,
} as const;

// ============================================
// 辅助函数
// ============================================

export function getSpeciesConfig(species: SpeciesId): SpeciesConfig {
    return SPECIES[species];
}
