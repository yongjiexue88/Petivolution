// ============================================
// V1 Toolbar
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
        stats,
    } = useGameStore();

    const handleTimeScale = (scale: 0 | 1 | 2 | 4) => {
        setTimeScale(scale);

        // V1.3 Support Server Mode
        if (useGameStore.getState().useServer) {
            import('../api/ServerClient').then(({ ServerClient }) => {
                ServerClient.getInstance().setRules({ timeScale: scale });
            });
        }

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

            {/* Eco Stress Indicator */}
            <div className="eco-stress-indicator">
                <div className="eco-stress-label">
                    <span>Eco</span>
                    <span className={`eco-stress-value ${(stats?.ecoStress || 0) > 80 ? 'critical' : (stats?.ecoStress || 0) > 50 ? 'warning' : ''}`}>
                        {stats?.ecoStress || 0}%
                    </span>
                </div>
                <div className="eco-stress-track">
                    <div
                        className={`eco-stress-fill ${(stats?.ecoStress || 0) > 80 ? 'critical' : (stats?.ecoStress || 0) > 50 ? 'warning' : ''}`}
                        style={{ width: `${Math.min(100, stats?.ecoStress || 0)}%` }}
                    ></div>
                </div>
                {/* Custom Tooltip */}
                <div className="eco-tooltip" style={{ width: stats?.ecoStressDetails ? '260px' : '220px' }}>
                    <div className="eco-tooltip-title">🌿 Ecosystem Stress: {stats?.ecoStress || 0}%</div>
                    {stats?.ecoStressDetails ? (
                        <>
                            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                                <span>Pop Stress: {stats.ecoStressDetails.populationStress}%</span>
                                <span>Diversity Pen: {stats.ecoStressDetails.diversityPenalty}%</span>
                            </div>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {stats.ecoStressDetails.speciesStatus.map(s => (
                                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 6px', background: s.status === 'ok' ? 'rgba(34, 197, 94, 0.1)' : s.status.includes('critical') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)', borderRadius: '3px' }}>
                                        <span style={{ textTransform: 'capitalize' }}>{s.id}</span>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <span style={{ color: s.status === 'ok' ? '#86efac' : s.status.includes('critical') ? '#fca5a5' : '#fdba74' }}>{s.count}</span>
                                            <span style={{ opacity: 0.5, fontSize: '0.85em', width: '30px', textAlign: 'right' }}>{s.min}-{s.max}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>
                                {stats.ecoStressDetails.diversityPenalty > 0 ? 'Tip: Add missing species!' : (stats.ecoStress || 0) > 50 ? 'Tip: Reduce key populations.' : 'Ecosystem is balanced.'}
                            </div>
                        </>
                    ) : (
                        <>
                            <p>Measures pressure from overcrowding and resource scarcity.</p>
                            <div className="eco-tooltip-levels">
                                <div><span className="level-ok">●</span> 0-50%: Stable</div>
                                <div><span className="level-warning">●</span> 50-80%: Warning</div>
                                <div><span className="level-critical">●</span> 80%+: Critical</div>
                            </div>
                            <p className="eco-tooltip-tip">💡 Lower by adding water/food or reducing population.</p>
                        </>
                    )}
                </div>
            </div>


            {/* Tool Selection */}
            <div className="toolbar-section">
                <button
                    className={`tool-btn ${currentTool === 'select' ? 'active' : ''}`}
                    onClick={() => setCurrentTool('select')}
                    title="Select Tool"
                >
                    👆 Select
                </button>
                <button
                    className={`tool-btn ${showSpawnPanel ? 'active' : ''}`}
                    onClick={() => {
                        togglePanel('spawn');
                        // Placing mode is OFF by default - user enables it in the panel
                        if (currentTool === 'spawn') setCurrentTool('select');
                    }}
                    title="Spawn Animals"
                >
                    🐾 Spawn
                </button>
                <button
                    className={`tool-btn ${currentTool === 'place' ? 'active' : ''}`}
                    onClick={() => {
                        setCurrentTool('place');
                        // Also open the rules panel if not already open
                        if (!showRulesPanel) togglePanel('rules');
                    }}
                    title="Place Objects"
                >
                    🌿 Place
                </button>
                <button
                    className="tool-btn"
                    onClick={() => {
                        const confirmed = window.confirm('⚠️ RESET WORLD? This will clear all entities and sync to a fresh state.');
                        if (confirmed) {
                            console.log('🔄 Requesting World Reset...');
                            import('../api/ServerClient').then(({ ServerClient }) => {
                                ServerClient.getInstance().resetWorld().then(res => {
                                    if (res.ok) {
                                        console.log('✅ World Reset Successful');
                                        window.location.reload();
                                    } else {
                                        console.error('❌ Reset Failed:', res.error);
                                        alert('Reset Failed: ' + res.error);
                                    }
                                });
                            });
                        }
                    }}
                    title="Reset World (Same as Shift+A)"
                >
                    🔄 Reset
                </button>
            </div>

            {/* Time Controls */}
            <div className="toolbar-section time-controls">
                <span className="section-label">Speed</span>
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

            {/* Panel Toggles */}
            <div className="toolbar-group">


                <button
                    className={`tool-btn ${showGraveyardPanel ? 'active' : ''}`}
                    onClick={() => togglePanel('graveyard')}
                    title="Graveyard"
                >
                    🪦
                </button>
                <button
                    className={`tool-btn ${showEventLog ? 'active' : ''}`}
                    onClick={() => togglePanel('eventLog')}
                    title="Event Log"
                >
                    📜
                </button>
                <button
                    className={`tool-btn ${useGameStore().showChallengePanel ? 'active' : ''}`}
                    onClick={() => togglePanel('challenge')}
                    title="Challenge"
                >
                    🏆
                </button>
                <button
                    className={`tool-btn ${showDebugPanel ? 'active' : ''}`}
                    onClick={() => togglePanel('debug')}
                    title="Debug Tools"
                >
                    ⚙️
                </button>
            </div>
        </div>
    );
}
