
import { useGameStore, getSimWorker } from '../store/gameStore';
import './WorldRulesPanel.css'; // Re-use panel styles for consistency

export function DebugPanel() {
    const {
        rules,
        setRules,
        togglePanel
    } = useGameStore();

    const handleToggleDebug = (key: keyof typeof rules.debug) => {
        const worker = getSimWorker();
        const newDebug = { ...rules.debug, [key]: !rules.debug[key] };
        setRules({ debug: newDebug });

        if (worker) {
            worker.postMessage({
                type: 'SET_RULES',
                payload: { rules: { debug: newDebug } }
            });
        }
    };

    return (
        <div className="panel debug-panel" style={{ width: '280px', right: '20px', bottom: '100px', top: 'auto', left: 'auto' }}>
            <div className="panel-header">
                <span className="panel-icon">🔧</span>
                <h3>Debug Tools</h3>
                <button className="close-btn" onClick={() => togglePanel('debug')}>×</button>
            </div>

            <div className="panel-body">
                <div className="form-group">
                    <label>Visual Overlays</label>
                    <div className="debug-options" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={rules.debug.showSenseRadius}
                                onChange={() => handleToggleDebug('showSenseRadius')}
                            />
                            Show Sense Radius
                        </label>
                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={rules.debug.showTargets}
                                onChange={() => handleToggleDebug('showTargets')}
                            />
                            Show Target Lines
                        </label>
                        <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={rules.debug.showChunkBounds}
                                onChange={() => handleToggleDebug('showChunkBounds')}
                            />
                            Show Chunk Bounds
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
