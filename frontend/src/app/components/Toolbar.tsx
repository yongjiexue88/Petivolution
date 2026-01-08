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
        godPower,
        maxGodPower,
        showEventLog,
    } = useGameStore();

    const handleTimeScale = (scale: 0 | 1 | 2 | 4) => {
        setTimeScale(scale);
        const worker = getSimWorker();
        if (worker) {
            worker.postMessage({ type: 'SET_TIME_SCALE', payload: { timeScale: scale } });
        }
    };

    const gpPct = Math.min(100, Math.max(0, (godPower / maxGodPower) * 100));

    return (
        <div className="toolbar">
            {/* Logo */}
            <div className="toolbar-logo">
                <span className="logo-icon">⚡</span>
                <span className="logo-text">God Mode</span>
            </div>

            {/* V1.1 God Power Display */}
            <div className="god-power-bar-container" title="God Power (Regens over time)">
                <div className="gp-text">GP: {Math.floor(godPower)}/{maxGodPower}</div>
                <div className="gp-track">
                    <div className="gp-fill" style={{ width: `${gpPct}%` }}></div>
                </div>
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
            <div className="toolbar-group">
                <button
                    className={`tool-btn ${showSpawnPanel ? 'active' : ''}`}
                    onClick={() => togglePanel('spawn')}
                    title="投放面板"
                >
                    📦
                </button>
                <button
                    className={`tool-btn ${showRulesPanel ? 'active' : ''}`}
                    onClick={() => togglePanel('rules')}
                    title="世界规则"
                >
                    ⚙️
                </button>
                <button
                    className={`tool-btn ${showGraveyardPanel ? 'active' : ''}`}
                    onClick={() => togglePanel('graveyard')}
                    title="墓碑"
                >
                    🪦
                </button>
                <button
                    className={`tool-btn ${showEventLog ? 'active' : ''}`}
                    onClick={() => togglePanel('eventLog')}
                    title="事件日志"
                >
                    📜
                </button>
                <button
                    className={`tool-btn ${useGameStore().showChallengePanel ? 'active' : ''}`}
                    onClick={() => togglePanel('challenge')}
                    title="挑战"
                >
                    🏆
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
