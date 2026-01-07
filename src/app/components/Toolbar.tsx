// ============================================
// V1 工具栏
// ============================================

import { useGameStore, getSimWorker } from '../store/gameStore';
import './Toolbar.css';

export function Toolbar() {
    const {
        currentTool,
        setCurrentTool,
        rules,
        setTimeScale,
        togglePanel,
        showSpawnPanel,
        showRulesPanel,
        showGraveyardPanel,
        showDebugPanel,
    } = useGameStore();

    const handleTimeScale = (scale: 0 | 1 | 2 | 4) => {
        setTimeScale(scale);
        const worker = getSimWorker();
        if (worker) {
            worker.postMessage({ type: 'SET_TIME_SCALE', payload: { timeScale: scale } });
        }
    };

    return (
        <div className="toolbar">
            {/* Logo */}
            <div className="toolbar-logo">
                <span className="logo-icon">🦎</span>
                <span className="logo-text">Petivolution</span>
            </div>

            {/* 工具选择 */}
            <div className="toolbar-section">
                <button
                    className={`tool-btn ${currentTool === 'select' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('select')}
                    title="选择工具"
                >
                    👆 选择
                </button>
                <button
                    className={`tool-btn ${currentTool === 'spawn' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('spawn')}
                    title="投放动物"
                >
                    🐾 投放
                </button>
                <button
                    className={`tool-btn ${currentTool === 'place' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('place')}
                    title="放置物品"
                >
                    🌿 放置
                </button>
                <button
                    className={`tool-btn ${currentTool === 'delete' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('delete')}
                    title="删除"
                >
                    🗑️ 删除
                </button>
            </div>

            {/* 时间控制 */}
            <div className="toolbar-section time-controls">
                <span className="section-label">速度</span>
                <button
                    className={`speed-btn ${rules.timeScale === 0 ? 'active' : ''}`}
                    onClick={() => handleTimeScale(0)}
                >
                    ⏸
                </button>
                <button
                    className={`speed-btn ${rules.timeScale === 1 ? 'active' : ''}`}
                    onClick={() => handleTimeScale(1)}
                >
                    1x
                </button>
                <button
                    className={`speed-btn ${rules.timeScale === 2 ? 'active' : ''}`}
                    onClick={() => handleTimeScale(2)}
                >
                    2x
                </button>
                <button
                    className={`speed-btn ${rules.timeScale === 4 ? 'active' : ''}`}
                    onClick={() => handleTimeScale(4)}
                >
                    4x
                </button>
            </div>

            {/* 面板切换 */}
            <div className="toolbar-section panel-toggles">
                <button
                    className={`panel-btn ${showSpawnPanel ? 'active' : ''}`}
                    onClick={() => togglePanel('spawn')}
                >
                    🐾 投放
                </button>
                <button
                    className={`panel-btn ${showRulesPanel ? 'active' : ''}`}
                    onClick={() => togglePanel('rules')}
                >
                    ⚙️ 规则
                </button>
                <button
                    className={`panel-btn ${showGraveyardPanel ? 'active' : ''}`}
                    onClick={() => togglePanel('graveyard')}
                >
                    ⚰️ 墓地
                </button>
                <button
                    className={`panel-btn ${showDebugPanel ? 'active' : ''}`}
                    onClick={() => togglePanel('debug')}
                >
                    🔧 调试
                </button>
            </div>
        </div>
    );
}
