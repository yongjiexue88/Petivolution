// ============================================
// AI 模块导出
// ============================================

// 感知系统
export {
    perceive,
    distance,
    normalize,
    type PerceptionResult,
} from './perception';

// Utility 决策系统
export {
    calculateUtility,
    selectGoal,
} from './utility';

// 动作系统
export {
    executeAction,
} from './actions';
