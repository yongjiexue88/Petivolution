// ============================================
// V1 世界规则配置
// ============================================

import type { WorldRule } from '../../shared/types';

// ============================================
// 默认规则
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
// 预设规则（三档生态系统）
// ============================================

export const RULE_PRESETS: Record<'balanced' | 'wild' | 'abundant' | 'chaos' | 'challenge_backyard', WorldRule> = {
    // 平衡模式：默认设置
    balanced: { ...DEFAULT_RULES },

    // 狂野模式：更多老鼠，更多猫
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

    // 丰饶模式：更少老鼠繁殖，更稳定
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

    // 混沌模式：大量老鼠，大量猫，高繁殖率
    chaos: {
        ...DEFAULT_RULES,
        ratSpawn: {
            ...DEFAULT_RULES.ratSpawn,
            probability: 0.75, // 更高的繁殖概率
            minRatsNearbyToStop: 15, // 更多老鼠才会停止繁殖
            maxRatsNearby: 20, // 允许更多老鼠
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
        timeScale: 2, // 加快时间流逝
        ai: {
            ...DEFAULT_RULES.ai,
            chaseTimeoutTicks: 60, // 疯狂追逐
        },
    },

    // 挑战：庭院平衡 (Backyard Balance)
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
// 辅助函数
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
