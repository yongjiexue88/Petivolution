// ============================================
// V1 AI - Utility 决策系统
// ============================================

import type {
    EntityRuntime,
    Goal,
    Stimulus,
} from '@shared/types';
import type { SimulationState } from '../core/tick';
import { SPECIES_CONFIGS, clamp01 } from '@shared/species.config';
import { V1 } from '@shared/constants';

// ============================================
// Utility 计算
// ============================================

export function calculateUtility(
    entity: EntityRuntime,
    sim: SimulationState
): Partial<Record<Goal, number>> {
    const config = SPECIES_CONFIGS[entity.species];
    const uw = config.utility;
    const v = entity.vitals;
    const stimuli = entity.ai.recentStimuli;

    // ========================================
    // 计算紧急度 (0..1, 越高越急)
    // ========================================
    const uHunger = clamp01(1 - v.hunger01);
    const uThirst = clamp01(1 - v.thirst01);
    const uFatigue = clamp01(1 - v.fatigue01);

    // 恐惧: 看到捕食者
    let uFear = 0;
    const predatorStimulus = stimuli.find(s => s.type === 'predator');
    if (predatorStimulus) {
        const senseRadiusPx = config.sense.radiusTiles * V1.tileSizePx;
        uFear = clamp01(1 - (predatorStimulus.dist / senseRadiusPx));
    }

    // ========================================
    // 获取最近资源
    // ========================================
    const nearestWater = findNearest(stimuli, 'water');
    const nearestBush = findNearest(stimuli, 'bush');
    const nearestTrash = findNearest(stimuli, 'trash');
    const nearestPrey = findNearest(stimuli, 'prey');

    // ========================================
    // 计算每个 Goal 的分数
    // ========================================
    const scores: Partial<Record<Goal, number>> = {};

    // -------- Flee --------
    if (entity.species === 'rat' || entity.species === 'chicken' || entity.species === 'smallBird') {
        let fleeScore = uw.base.flee;
        fleeScore += uw.urgency.fear * uFear;

        if (nearestBush) {
            fleeScore += uw.bonuses.nearBush;
            fleeScore -= uw.distancePenalty.bush * (nearestBush.dist / V1.tileSizePx);
        }

        // 性格加成
        const personalityMod = uw.personality[entity.personality];
        if (personalityMod.fear) fleeScore += personalityMod.fear * uFear;
        if (personalityMod.nearBush) fleeScore += personalityMod.nearBush;

        scores.flee = fleeScore;

        // 强制逃跑规则: 恐惧度 > 0.2 时强制逃跑
        if (uFear > 0.2) {
            scores.flee = 100; // 最高优先级
        }
    }

    // -------- Drink --------
    {
        let drinkScore = uw.base.drink;
        drinkScore += uw.urgency.thirst * uThirst;

        if (nearestWater) {
            drinkScore += uw.bonuses.nearWater;
            drinkScore -= uw.distancePenalty.water * (nearestWater.dist / V1.tileSizePx);
        } else {
            drinkScore -= 0.5; // 没看到水，减分
        }

        scores.drink = drinkScore;
    }

    // -------- Eat (从垃圾堆，鼠用) --------
    if (entity.species === 'rat') {
        let eatScore = uw.base.eat;
        eatScore += uw.urgency.hunger * uHunger;

        if (nearestTrash) {
            eatScore += uw.bonuses.nearTrash;
            eatScore -= uw.distancePenalty.trash * (nearestTrash.dist / V1.tileSizePx);
        } else {
            eatScore -= 0.5;
        }

        const personalityMod = uw.personality[entity.personality];
        if (personalityMod.nearTrash) eatScore += personalityMod.nearTrash;

        scores.eat = eatScore;
    }

    // -------- Forage (Chicken/Bird) --------
    if (entity.species === 'chicken' || entity.species === 'smallBird' || entity.species === 'rat') {
        let forageScore = uw.base.forage ?? 0;
        forageScore += uw.urgency.hunger * uHunger;

        // Chickens like bushes
        if (nearestBush && entity.species === 'chicken') {
            forageScore += uw.bonuses.nearBush * 0.5;
        }

        const personalityMod = uw.personality[entity.personality];
        if (personalityMod.forage) forageScore += personalityMod.forage;

        scores.forage = forageScore;
    }

    // -------- Rummage (Raccoon Only) --------
    if (entity.species === 'raccoon') {
        let rummageScore = uw.base.eat ?? 0;
        rummageScore += uw.urgency.hunger * uHunger;

        if (nearestTrash) {
            rummageScore += uw.bonuses.nearTrash;
            rummageScore -= uw.distancePenalty.trash * (nearestTrash.dist / V1.tileSizePx);

            if (uHunger > 0.6) {
                rummageScore += 20;
            }
        } else {
            rummageScore -= 5;
        }

        scores.rummage = rummageScore;
    }

    // -------- Eat (Prey/Carrion) --------
    if (entity.species === 'cat' || entity.species === 'fox' || entity.species === 'wolf' || entity.species === 'hawk' || entity.species === 'snake') {
        let huntScore = uw.base.hunt;
        huntScore += uw.urgency.hunger * uHunger;

        if (nearestPrey) {
            huntScore += uw.bonuses.seesPrey;
            huntScore -= uw.distancePenalty.prey * (nearestPrey.dist / V1.tileSizePx);
        } else {
            huntScore -= 0.8;
        }

        const personalityMod = uw.personality[entity.personality];
        if (personalityMod.seesPrey) huntScore += personalityMod.seesPrey;
        if (personalityMod.hunger) huntScore += personalityMod.hunger * uHunger;

        scores.hunt = huntScore;
    }

    // -------- Bark (Dog Only) --------
    if (entity.species === 'dog') {
        const nearestIntruder = stimuli.find(s => s.type === 'intruder');
        let barkScore = uw.base.bark ?? 0;

        if (nearestIntruder) {
            const senseRadiusPx = config.sense.radiusTiles * V1.tileSizePx;
            const intruderUrgency = clamp01(1 - (nearestIntruder.dist / senseRadiusPx));
            barkScore += uw.bonuses.nearIntruder * intruderUrgency;

            if (intruderUrgency > 0.5) {
                barkScore += 10;
            }
        } else {
            barkScore -= 1.0;
        }

        scores.bark = barkScore;
    }

    // -------- Patrol (Dog Only) --------
    if (entity.species === 'dog') {
        let patrolScore = uw.base.patrol ?? 0;
        if (entity.ai.currentGoal === 'patrol') {
            patrolScore += 0.2;
        }
        scores.patrol = patrolScore;
    }

    // -------- Rest (Sleep) --------
    {
        let restScore = uw.base.rest;
        restScore += uw.urgency.fatigue * uFatigue;

        // Day/night cycle removed - rest is now purely based on fatigue

        if (nearestBush) {
            restScore += uw.bonuses.nearBush * 0.5;
        }

        if (entity.species === 'smallBird') {
            const nearestPerch = findNearest(stimuli, 'perch');
            if (nearestPerch) {
                restScore += 0.3 + uFatigue * 0.2;
                restScore -= (uw.distancePenalty.bush * 0.5) * (nearestPerch.dist / V1.tileSizePx);
            }
        }

        const personalityMod = uw.personality[entity.personality];
        if (personalityMod.rest) restScore += personalityMod.rest;

        scores.rest = restScore;
    }

    // -------- Wander --------
    {
        let wanderScore = uw.base.wander;
        if (entity.personality === 'curious') {
            wanderScore += 0.02;
        }
        scores.wander = wanderScore;
    }

    return scores;
}

// ============================================
// Goal 选择
// ============================================

export function selectGoal(scores: Partial<Record<Goal, number>>): Goal {
    let bestGoal: Goal = 'wander';
    let bestScore = -Infinity;

    for (const [goal, score] of Object.entries(scores)) {
        if (score !== undefined && score > bestScore) {
            bestScore = score;
            bestGoal = goal as Goal;
        }
    }

    return bestGoal;
}

// ============================================
// 辅助函数
// ============================================

function findNearest(
    stimuli: Stimulus[],
    type: Stimulus['type']
): { dist: number } | null {
    const found = stimuli.find(s => s.type === type);
    return found ? { dist: found.dist } : null;
}
