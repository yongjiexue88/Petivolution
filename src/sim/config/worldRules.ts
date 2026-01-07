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

export const RULE_PRESETS: Record<'balanced' | 'wild' | 'abundant', WorldRule> = {
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
            rat: 25,
            cat: 7,
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
