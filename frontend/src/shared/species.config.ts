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
        nearPerch: number; // Added V4
        nearIntruder: number; // Added for Dog
    };
    distancePenalty: {
        water: number;
        bush: number;
        prey: number;
        trash: number;
        perch: number; // Added V4
    };
    personality: Record<Personality, Partial<UtilityWeights['bonuses'] & UtilityWeights['urgency'] & UtilityWeights['base']>>;
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
        moveStyle?: 'run' | 'hop' | 'fly'; // Added V4
    };

    activityCycle?: 'diurnal' | 'nocturnal' | 'crepuscular'; // Added V4 Pack 2

    // V4 Flocking
    flock?: {
        enabled: boolean;
        cohesionWeight: number; // 0..1
        alignmentWeight: number; // 0..1
        separationWeight: number; // 0..1
        radiusTiles: number;
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
        damagePerHit?: number;
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
        wanderJitter: 0.6,
        turnSmooth: 0.35,
    },
    sense: {
        radiusTiles: 6, // Small prey, survives by hiding
    },
    // Colony behavior - rats stay loosely grouped
    flock: {
        enabled: true,
        cohesionWeight: 0.3,
        alignmentWeight: 0.1,
        separationWeight: 0.2,
        radiusTiles: 5,
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
    reproduction: {
        enabled: true,
        minHunger: 0.7,
        minAgeTicks: 300,
        cooldownTicks: 600,
        energyCost: 0.25,
        maxPopulation: 100,
        probabilityPerSecond: 0.2,
    },
    utility: {
        base: {
            flee: 0.2,
            drink: 0.05,
            eat: 0.05,
            rest: 0.02,
            wander: 0.01,
            hunt: -999,
            forage: 0.1, // V4
            rummage: 0,
            bark: -999,
            patrol: -999,
            reproduce: 0.1,
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
            nearPerch: 0,
            nearIntruder: 0,
        },
        distancePenalty: {
            bush: 0.06,
            water: 0.04,
            trash: 0.03,
            prey: 0,
            perch: 0,
        },
        personality: {
            cautious: { fear: 1.0, nearBush: 0.4, flee: 0.3 }, // Hides more, very fearful
            brave: { fear: -0.6, nearTrash: 0.25, eat: 0.15 }, // Ventures out boldly
            curious: { nearTrash: 0.2, nearWater: 0.15, wander: 0.2 }, // Explores more
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
        speedTilesPerTick: 0.05,
        wanderJitter: 0.4,
        turnSmooth: 0.1,
        moveStyle: 'run',
    },
    // Chickens flock together
    flock: {
        enabled: false,
        cohesionWeight: 0,
        alignmentWeight: 0,
        separationWeight: 0,
        radiusTiles: 0,
    },
    sense: {
        radiusTiles: 10, // Ambush predator, stalks close
    },
    vitals: {
        hungerDecayPerTick: 0.0007,
        thirstDecayPerTick: 0.0007,
        fatigueDecayPerTick: 0.00045,
        drinkGainPerTick: 0.010,
        eatGainPerTick: 0.014,
        sleepGainPerTick: 0.006,
        dangerThreshold01: 0.15,
        healthDamageWhenHungerBelow: 0.0009,
        healthDamageWhenThirstBelow: 0.0010,
    },
    combat: {
        attackRangeTiles: 0.6,
        attackCooldownTicks: 10,
        killOnHit: true,
        damagePerHit: 1.0,
    },
    utility: {
        base: {
            hunt: 0.08,
            drink: 0.06,
            rest: 0.03,
            wander: 0.01,
            eat: 0.0,
            flee: -999,
            forage: -999,
            rummage: 0,
            bark: -999,
            patrol: -999,
            reproduce: 0.1,
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
            nearPerch: 0,
            nearIntruder: 0,
        },
        distancePenalty: {
            prey: 0.05,
            water: 0.04,
            trash: 0.03,
            bush: 0.0,
            perch: 0,
        },
        personality: {
            brave: { seesPrey: 0.4, hunger: 0.25, hunt: 0.3 }, // Aggressive hunter
            cautious: { seesPrey: -0.2, thirst: 0.1, rest: 0.15 }, // Careful, stalking approach
            curious: { nearTrash: 0.15, wander: 0.2 }, // Investigates areas
        },
    },
    spriteKey: 'cat',
    spriteColor: 0xffa500,
};

// ============================================
// 🐔 鸡 (Chicken) 配置
// ============================================

export const CHICKEN_CONFIG: SpeciesConfig = {
    id: 'chicken',
    move: {
        speedTilesPerTick: 0.05,
        wanderJitter: 0.5,
        turnSmooth: 0.25,
    },
    sense: {
        radiusTiles: 8, // Ground-bound, limited vision
    },
    // Chickens flock together
    flock: {
        enabled: true,
        cohesionWeight: 0.4,
        alignmentWeight: 0.2,
        separationWeight: 0.4,
        radiusTiles: 6,
    },
    vitals: {
        hungerDecayPerTick: 0.0005,
        thirstDecayPerTick: 0.0006,
        fatigueDecayPerTick: 0.0004,
        drinkGainPerTick: 0.015,
        eatGainPerTick: 0.02,
        sleepGainPerTick: 0.006,
        dangerThreshold01: 0.2,
        healthDamageWhenHungerBelow: 0.0008,
        healthDamageWhenThirstBelow: 0.001,
    },
    utility: {
        base: {
            flee: 0.0,
            forage: 0.15,
            drink: 0.05,
            rest: 0.02,
            wander: 0.05,
            eat: 0.0,
            hunt: -999,
            rummage: 0,
            bark: -999,
            patrol: -999,
            reproduce: 0.1,
        },
        urgency: {
            fear: 2.5,
            hunger: 1.2,
            thirst: 1.0,
            fatigue: 0.5,
        },
        bonuses: {
            nearBush: 0.2,
            nearWater: 0.1,
            nearTrash: 0.0,
            seesPrey: 0,
            nearPerch: 0,
            nearIntruder: 0,
        },
        distancePenalty: {
            bush: 0.04,
            water: 0.04,
            trash: 0,
            prey: 0,
            perch: 0,
        },
        personality: {
            brave: { fear: -0.8, forage: 0.25, flee: -0.3 }, // Stands ground briefly
            cautious: { fear: 1.0, nearBush: 0.4, flee: 0.4 }, // Runs from everything
            curious: { wander: 0.25, forage: 0.15 }, // Wanders further foraging
        },
    },
    spriteKey: 'chicken',
    spriteColor: 0xFFA07A, // Light Salmon
};

// ============================================
// 🐦 小鸟 (Small Bird) 配置
// ============================================

export const SMALL_BIRD_CONFIG: SpeciesConfig = {
    id: 'smallBird',
    move: {
        speedTilesPerTick: 0.06,
        wanderJitter: 0.8,
        turnSmooth: 0.5,
        moveStyle: 'hop',
    },
    sense: {
        radiusTiles: 12, // Good vision, flocking extends awareness
    },
    flock: {
        enabled: true,
        cohesionWeight: 0.5,
        alignmentWeight: 0.3,
        separationWeight: 0.3,
        radiusTiles: 8,
    },
    vitals: {
        hungerDecayPerTick: 0.0004,
        thirstDecayPerTick: 0.0005,
        fatigueDecayPerTick: 0.0004,
        drinkGainPerTick: 0.02,
        eatGainPerTick: 0.025,
        sleepGainPerTick: 0.008,
        dangerThreshold01: 0.25,
        healthDamageWhenHungerBelow: 0.001,
        healthDamageWhenThirstBelow: 0.0012,
    },
    utility: {
        base: {
            flee: 0.0,
            forage: 0.1,
            drink: 0.05,
            rest: 0.02,
            wander: 0.05,
            eat: 0.0,
            hunt: -999,
            rummage: 0,
            bark: -999,
            patrol: -999,
            reproduce: 0.1,
        },
        urgency: {
            fear: 3.0,
            hunger: 1.0,
            thirst: 1.0,
            fatigue: 0.6,
        },
        bonuses: {
            nearBush: 0.3,
            nearWater: 0.1,
            nearTrash: 0.0,
            seesPrey: 0,
            nearPerch: 0.4, // Likes perching
            nearIntruder: 0,
        },
        distancePenalty: {
            bush: 0.03,
            water: 0.03,
            trash: 0,
            prey: 0,
            perch: 0.02,
        },
        personality: {
            brave: { fear: -0.5, forage: 0.2 }, // Less fearful, forages more
            cautious: { fear: 1.0, rest: 0.25, nearPerch: 0.3 }, // Stays perched, very fearful
            curious: { wander: 0.3, forage: 0.15 }, // Explores actively
        },
    },
    spriteKey: 'smallBird',
    spriteColor: 0x87CEEB, // Sky Blue
};

// ============================================
// 对象交互配置
// ============================================

// ============================================
// 物种配置映射
// ============================================

export const RACCOON_CONFIG: SpeciesConfig = {
    id: 'raccoon',
    move: {
        speedTilesPerTick: 0.16,
        wanderJitter: 0.6,
        turnSmooth: 0.3,
        moveStyle: 'run'
    },
    sense: { radiusTiles: 8 }, // Nocturnal, relies on smell IRL

    flock: { enabled: false, cohesionWeight: 0, alignmentWeight: 0, separationWeight: 0, radiusTiles: 0 },

    vitals: {
        hungerDecayPerTick: 0.0007,
        thirstDecayPerTick: 0.0007,
        fatigueDecayPerTick: 0.0004, // Resilient
        drinkGainPerTick: 0.012,
        eatGainPerTick: 0.01,
        sleepGainPerTick: 0.008,
        dangerThreshold01: 0.25,
        healthDamageWhenHungerBelow: 0.001,
        healthDamageWhenThirstBelow: 0.001,
    },
    combat: {
        attackRangeTiles: 1.2,
        attackCooldownTicks: 25,
        killOnHit: false,
        damagePerHit: 0.15
    },
    reproduction: {
        enabled: true,
        minHunger: 0.6,
        minAgeTicks: 1500,
        cooldownTicks: 2000,
        energyCost: 0.3,
        maxPopulation: 5,
        probabilityPerSecond: 0.05,
    },
    utility: {
        base: {
            drink: 1.0, eat: 1.2, hunt: 0.5, rest: 0.8, flee: 5.0, wander: 0.3, forage: 0.5, rummage: 2.0, bark: -999, patrol: -999, reproduce: 0.1
        },
        urgency: {
            hunger: 3.5, thirst: 3.0, fatigue: 2.5, fear: 4.0
        },
        bonuses: {
            seesPrey: 1.5,
            nearTrash: 4.0,
            nearWater: 1.5,
            nearBush: 1.0,
            nearPerch: 0.0,
            nearIntruder: 0.0,
        },
        distancePenalty: {
            water: 0.1, bush: 0.0, prey: 0.2, trash: 0.05, perch: 0.0
        },
        personality: {
            curious: { nearTrash: 6.0, wander: 1.0, rummage: 1.5 }, // Trash-obsessed explorer
            cautious: { fear: 6.0, flee: 7.0, rest: 2.0 }, // Very careful, hides more
            brave: { hunt: 2.0, fear: 1.0, rummage: 1.0 } // Predatory, less afraid
        }
    },
    spriteKey: 'raccoon_idle',
    spriteColor: 0x888888
};

export const CROW_CONFIG: SpeciesConfig = {
    id: 'crow',
    move: {
        speedTilesPerTick: 0.25,
        wanderJitter: 0.8,
        turnSmooth: 0.5,
        moveStyle: 'fly'
    },
    sense: { radiusTiles: 16 }, // Flying, excellent vision

    flock: { enabled: true, cohesionWeight: 0.4, alignmentWeight: 0.3, separationWeight: 0.5, radiusTiles: 10 },

    vitals: {
        hungerDecayPerTick: 0.0009, // High metabolism
        thirstDecayPerTick: 0.0008,
        fatigueDecayPerTick: 0.0006,
        drinkGainPerTick: 0.01,
        eatGainPerTick: 0.015,
        sleepGainPerTick: 0.007,
        dangerThreshold01: 0.2,
        healthDamageWhenHungerBelow: 0.002, // Fragile
        healthDamageWhenThirstBelow: 0.002,
    },
    combat: {
        attackRangeTiles: 0.8,
        attackCooldownTicks: 15,
        killOnHit: false,
        damagePerHit: 0.05
    },
    reproduction: {
        enabled: true,
        minHunger: 0.75,
        minAgeTicks: 1000,
        cooldownTicks: 1200,
        energyCost: 0.2,
        maxPopulation: 10,
        probabilityPerSecond: 0.1,
    },
    utility: {
        base: {
            drink: 1.0, eat: 1.5, hunt: 0.1, rest: 0.8, flee: 6.0, wander: 0.4, forage: 0.2, rummage: 0, bark: -999, patrol: -999, reproduce: 0.1
        },
        urgency: {
            hunger: 4.0, thirst: 3.0, fatigue: 3.0, fear: 5.0
        },
        bonuses: {
            seesPrey: 2.0,
            nearTrash: 2.0,
            nearWater: 1.0,
            nearBush: 0.5,
            nearPerch: 2.0,
            nearIntruder: 0.5,
        },
        distancePenalty: {
            water: 0.05, bush: 0.05, prey: 0.1, trash: 0.1, perch: 0.05
        },
        personality: {
            curious: { wander: 1.0, nearTrash: 1.5 }, // Investigates everything
            cautious: { fear: 7.0, flee: 5.0 }, // Very skittish
            brave: { hunt: 0.5, nearTrash: 1.0 } // Opportunistic
        }
    },
    spriteKey: 'crow_idle',
    spriteColor: 0x333333
};

export const DOG_CONFIG: SpeciesConfig = {
    id: 'dog',
    move: {
        speedTilesPerTick: 0.22,
        wanderJitter: 0.4,
        turnSmooth: 0.2,
        moveStyle: 'run'
    },
    sense: { radiusTiles: 12 },

    // Dogs are social, mild pack behavior
    flock: { enabled: true, cohesionWeight: 0.3, alignmentWeight: 0.2, separationWeight: 0.3, radiusTiles: 8 },

    vitals: {
        hungerDecayPerTick: 0.0005,
        thirstDecayPerTick: 0.0006,
        fatigueDecayPerTick: 0.0003,
        drinkGainPerTick: 0.015,
        eatGainPerTick: 0.015,
        sleepGainPerTick: 0.008,
        dangerThreshold01: 0.2,
        healthDamageWhenHungerBelow: 0.0005,
        healthDamageWhenThirstBelow: 0.0005,
    },
    combat: {
        attackRangeTiles: 1.5,
        attackCooldownTicks: 20,
        killOnHit: false,
        damagePerHit: 0.25
    },
    reproduction: {
        enabled: false, // Dogs spawned manually mostly
        minHunger: 1.1,
        minAgeTicks: 99999,
        cooldownTicks: 99999,
        energyCost: 1.0,
        maxPopulation: 1,
        probabilityPerSecond: 0,
    },
    utility: {
        base: { drink: 1, eat: 1, hunt: 1, rest: 1, flee: 1, wander: 0.5, forage: 0, rummage: 0, bark: 0.2, patrol: 0.5, reproduce: 0 },
        urgency: { hunger: 3, thirst: 3, fatigue: 3, fear: 2 },
        bonuses: { seesPrey: 3, nearTrash: 0, nearWater: 1, nearBush: 0, nearPerch: 0, nearIntruder: 2.5 },
        distancePenalty: { water: 0.1, bush: 0, prey: 0.1, trash: 0, perch: 0 },
        personality: {
            curious: { wander: 0.5, nearIntruder: 1.0 }, // Investigates intruders
            cautious: { patrol: 0.8, bark: 0.3 }, // Patrols cautiously
            brave: { hunt: 1.5, bark: 1.0, nearIntruder: 2.0 } // Aggressive guardian
        }
    },
    spriteKey: 'dog_idle',
    spriteColor: 0xCC9966
};


// ============================================
// 🦊 狐狸 (Fox) 配置 - Solitary cunning hunter
// ============================================
export const FOX_CONFIG: SpeciesConfig = {
    id: 'fox',
    move: {
        speedTilesPerTick: 0.18,
        wanderJitter: 0.5,
        turnSmooth: 0.25,
        moveStyle: 'run'
    },
    sense: { radiusTiles: 12 },
    flock: { enabled: false, cohesionWeight: 0, alignmentWeight: 0, separationWeight: 0, radiusTiles: 0 }, // Solitary
    vitals: {
        hungerDecayPerTick: 0.0006,
        thirstDecayPerTick: 0.0006,
        fatigueDecayPerTick: 0.0004,
        drinkGainPerTick: 0.012,
        eatGainPerTick: 0.015,
        sleepGainPerTick: 0.007,
        dangerThreshold01: 0.2,
        healthDamageWhenHungerBelow: 0.0008,
        healthDamageWhenThirstBelow: 0.0008,
    },
    combat: {
        attackRangeTiles: 1.0,
        attackCooldownTicks: 15,
        killOnHit: true,
        damagePerHit: 1.0
    },
    utility: {
        base: { drink: 1, eat: 1, hunt: 1.5, rest: 0.8, flee: 2, wander: 0.4, forage: 0, rummage: 0, bark: -999, patrol: -999, reproduce: 0.1 },
        urgency: { hunger: 3.5, thirst: 3, fatigue: 2.5, fear: 3 },
        bonuses: { seesPrey: 4, nearTrash: 0.5, nearWater: 1, nearBush: 1.5, nearPerch: 0, nearIntruder: 0 },
        distancePenalty: { water: 0.08, bush: 0.02, prey: 0.08, trash: 0, perch: 0 },
        personality: {
            curious: { wander: 0.5, nearBush: 0.5 }, // Explores cover
            cautious: { fear: 2.0, flee: 1.5, nearBush: 1.0 }, // Uses cover to hide
            brave: { hunt: 2.0, seesPrey: 1.5 } // Aggressive hunter
        }
    },
    spriteKey: 'fox_idle',
    spriteColor: 0xFF4500
};

// ============================================
// 🦅 鹰 (Hawk) 配置 - Aerial predator, best vision
// ============================================
export const HAWK_CONFIG: SpeciesConfig = {
    id: 'hawk',
    move: {
        speedTilesPerTick: 0.3,
        wanderJitter: 0.6,
        turnSmooth: 0.4,
        moveStyle: 'fly'
    },
    sense: { radiusTiles: 20 }, // Best eyesight of all
    flock: { enabled: false, cohesionWeight: 0, alignmentWeight: 0, separationWeight: 0, radiusTiles: 0 }, // Solitary hunter
    vitals: {
        hungerDecayPerTick: 0.0008,
        thirstDecayPerTick: 0.0006,
        fatigueDecayPerTick: 0.0005,
        drinkGainPerTick: 0.012,
        eatGainPerTick: 0.02,
        sleepGainPerTick: 0.008,
        dangerThreshold01: 0.15,
        healthDamageWhenHungerBelow: 0.0015,
        healthDamageWhenThirstBelow: 0.0012,
    },
    combat: {
        attackRangeTiles: 1.5,
        attackCooldownTicks: 20,
        killOnHit: true,
        damagePerHit: 1.0
    },
    utility: {
        base: { drink: 0.8, eat: 0.5, hunt: 2.0, rest: 0.6, flee: 1, wander: 0.5, forage: 0, rummage: 0, bark: -999, patrol: -999, reproduce: 0.1 },
        urgency: { hunger: 4, thirst: 2.5, fatigue: 2.5, fear: 2 },
        bonuses: { seesPrey: 5, nearTrash: 0, nearWater: 0.8, nearBush: 0, nearPerch: 2.5, nearIntruder: 0 },
        distancePenalty: { water: 0.05, bush: 0, prey: 0.03, trash: 0, perch: 0.03 },
        personality: {
            curious: { wander: 0.8, seesPrey: 1.0 }, // Scouts for prey
            cautious: { rest: 0.5, nearPerch: 1.0 }, // Waits on perch
            brave: { hunt: 2.5, seesPrey: 2.0 } // Aggressive diver
        }
    },
    spriteKey: 'hawk_idle',
    spriteColor: 0x8B4513
};

// ============================================
// 🐺 狼 (Wolf) 配置 - Pack hunter
// ============================================
export const WOLF_CONFIG: SpeciesConfig = {
    id: 'wolf',
    move: {
        speedTilesPerTick: 0.2,
        wanderJitter: 0.4,
        turnSmooth: 0.2,
        moveStyle: 'run'
    },
    sense: { radiusTiles: 14 }, // Good senses, pack coordination helps
    // Pack hunter - strong flocking
    flock: {
        enabled: true,
        cohesionWeight: 0.6,
        alignmentWeight: 0.5,
        separationWeight: 0.2,
        radiusTiles: 12
    },
    vitals: {
        hungerDecayPerTick: 0.0006,
        thirstDecayPerTick: 0.0005,
        fatigueDecayPerTick: 0.0003,
        drinkGainPerTick: 0.015,
        eatGainPerTick: 0.02,
        sleepGainPerTick: 0.008,
        dangerThreshold01: 0.1,
        healthDamageWhenHungerBelow: 0.0006,
        healthDamageWhenThirstBelow: 0.0006,
    },
    combat: {
        attackRangeTiles: 1.5,
        attackCooldownTicks: 18,
        killOnHit: true,
        damagePerHit: 1.0
    },
    utility: {
        base: { drink: 1, eat: 1, hunt: 2, rest: 0.8, flee: 0.5, wander: 0.4, forage: 0, rummage: 0, bark: -999, patrol: 0.3, reproduce: 0.1 },
        urgency: { hunger: 4, thirst: 3, fatigue: 2, fear: 1.5 },
        bonuses: { seesPrey: 4.5, nearTrash: 0, nearWater: 1.2, nearBush: 0.5, nearPerch: 0, nearIntruder: 1 },
        distancePenalty: { water: 0.08, bush: 0, prey: 0.06, trash: 0, perch: 0 },
        personality: {
            curious: { wander: 0.6, hunt: 0.5 }, // Scouts for pack
            cautious: { hunt: -0.5, rest: 0.8 }, // Follows pack lead
            brave: { hunt: 2.5, seesPrey: 2.0, flee: -0.5 } // Alpha behavior, leads hunts
        }
    },
    spriteKey: 'wolf_idle',
    spriteColor: 0x808080
};

// ============================================
// 🐍 蛇 (Snake) 配置 - Ambush predator, poor vision
// ============================================
export const SNAKE_CONFIG: SpeciesConfig = {
    id: 'snake',
    move: {
        speedTilesPerTick: 0.04, // Very slow
        wanderJitter: 0.3,
        turnSmooth: 0.15,
        moveStyle: 'run' // Slither animation handled separately
    },
    sense: { radiusTiles: 4 }, // Poor vision, relies on vibrations
    flock: { enabled: false, cohesionWeight: 0, alignmentWeight: 0, separationWeight: 0, radiusTiles: 0 }, // Solitary
    vitals: {
        hungerDecayPerTick: 0.0003, // Slow metabolism
        thirstDecayPerTick: 0.0004,
        fatigueDecayPerTick: 0.0002,
        drinkGainPerTick: 0.015,
        eatGainPerTick: 0.03, // Eats big meals infrequently
        sleepGainPerTick: 0.01,
        dangerThreshold01: 0.3,
        healthDamageWhenHungerBelow: 0.0004,
        healthDamageWhenThirstBelow: 0.0006,
    },
    combat: {
        attackRangeTiles: 0.8, // Strike range
        attackCooldownTicks: 30,
        killOnHit: true,
        damagePerHit: 1.0
    },
    utility: {
        base: { drink: 0.5, eat: 0.3, hunt: 1.5, rest: 1.0, flee: 1, wander: 0.2, forage: 0, rummage: 0, bark: -999, patrol: -999, reproduce: 0.1 },
        urgency: { hunger: 3, thirst: 2, fatigue: 1.5, fear: 2.5 },
        bonuses: { seesPrey: 3, nearTrash: 0, nearWater: 0.8, nearBush: 2.0, nearPerch: 0, nearIntruder: 0 }, // Loves cover
        distancePenalty: { water: 0.1, bush: 0.02, prey: 0.15, trash: 0, perch: 0 },
        personality: {
            curious: { wander: 0.4, nearBush: 0.5 }, // Explores cover areas
            cautious: { rest: 1.5, nearBush: 1.0, flee: 0.5 }, // Stays hidden
            brave: { hunt: 2.0, seesPrey: 1.5, flee: -0.5 } // Strikes without retreat
        }
    },
    spriteKey: 'snake_idle',
    spriteColor: 0x006400
};

export const SPECIES_CONFIGS: Record<SpeciesId, SpeciesConfig> = {
    rat: RAT_CONFIG,
    cat: CAT_CONFIG,
    chicken: CHICKEN_CONFIG,
    smallBird: SMALL_BIRD_CONFIG,
    raccoon: RACCOON_CONFIG,
    crow: CROW_CONFIG,
    dog: DOG_CONFIG,
    fox: FOX_CONFIG,
    hawk: HAWK_CONFIG,
    wolf: WOLF_CONFIG,
    snake: SNAKE_CONFIG,
};

// ============================================
// 对象交互配置
// ============================================

export type ObjectInteractConfig = {
    type: string;
    maxResources: number;
    regenRatePerTick: number;
    interactRangeTiles: number;
    strengthDefault?: number; // Added back
    indestructible?: boolean; // V4: Resource Anchor
};

export const OBJECT_CONFIGS: Record<string, ObjectInteractConfig> = {
    water: {
        type: 'water',
        maxResources: 100,
        regenRatePerTick: 0.005, // renormalized
        interactRangeTiles: 1.5,
        strengthDefault: 1.0,
        indestructible: true,
    },
    bush: {
        type: 'bush',
        maxResources: 0,
        regenRatePerTick: 0,
        interactRangeTiles: 2.0,
        strengthDefault: 0.8,
    },
    trash: {
        type: 'trash',
        maxResources: 80,
        regenRatePerTick: 0.002, // Regenerating anchor
        interactRangeTiles: 1.5,
        strengthDefault: 1.0,
    },
    perch: {
        type: 'perch',
        maxResources: 0,
        regenRatePerTick: 0,
        interactRangeTiles: 1.5,
        strengthDefault: 1.0,
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
