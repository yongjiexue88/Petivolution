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
// import { distance } from './perception';

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
    if (entity.species === 'rat') {
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

    // -------- Hunt (猫用) --------
    if (entity.species === 'cat') {
        let huntScore = uw.base.hunt;
        huntScore += uw.urgency.hunger * uHunger;

        if (nearestPrey) {
            huntScore += uw.bonuses.seesPrey;
            huntScore -= uw.distancePenalty.prey * (nearestPrey.dist / V1.tileSizePx);
        } else {
            huntScore -= 0.8; // 没看到猎物，大幅减分
        }

        const personalityMod = uw.personality[entity.personality];
        if (personalityMod.seesPrey) huntScore += personalityMod.seesPrey;
        if (personalityMod.hunger) huntScore += personalityMod.hunger * uHunger;

        scores.hunt = huntScore;
    }

    // -------- Rest --------
    {
        let restScore = uw.base.rest;
        restScore += uw.urgency.fatigue * uFatigue;

        if (nearestBush) {
            restScore += uw.bonuses.nearBush * 0.5;
        }

        scores.rest = restScore;
    }

    // -------- Wander --------
    {
        let wanderScore = uw.base.wander;

        // curious 人格爱闲逛
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
