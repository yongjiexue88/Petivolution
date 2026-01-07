// ============================================
// V1 世界规则面板
// ============================================

import { useGameStore, getSimWorker } from '../store/gameStore';
import type { ObjectType, WorldObject, TilePos } from '@shared/types';
import { OBJECT_CONFIGS } from '@shared/species.config';
import { v4 as uuid } from 'uuid';
import './WorldRulesPanel.css';

export function WorldRulesPanel() {
    const {
        placeObjectType,
        setPlaceObjectType,
        currentTool,
        setCurrentTool,
        rules,
        setRules,
        seed, // V1.2
        exportWorld, // V1.2
        importWorld, // V1.2
    } = useGameStore();

    // V1.2 Export
    const handleExport = () => {
        const data = exportWorld();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `petivolution-seed${data.world.seed}-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // V1.2 Import
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.version && data.entities) {
                    importWorld(data);
                    alert('World loaded successfully!');
                } else {
                    alert('Invalid save file format.');
                }
            } catch (err) {
                console.error(err);
                alert('Failed to parse save file.');
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    const handlePlaceObject = (type: ObjectType) => {
        setPlaceObjectType(type);
        setCurrentTool('place');
    };

    const handleQuickPlace = (type: ObjectType) => {
        const worker = getSimWorker();
        if (!worker) return;

        const pos: TilePos = {
            tx: Math.floor(30 + Math.random() * 140),
            ty: Math.floor(30 + Math.random() * 140),
        };

        const obj: WorldObject = {
            id: uuid(),
            type,
            pos,
            data: {
                resources: OBJECT_CONFIGS[type].maxResources,
                maxResources: OBJECT_CONFIGS[type].maxResources,
                regenRate: OBJECT_CONFIGS[type].regenRate,
                strength01: OBJECT_CONFIGS[type].strengthDefault,
            },
        };

        worker.postMessage({ type: 'PLACE_OBJECT', payload: { object: obj } });
    };

    const handleQuickRemove = (type: ObjectType) => {
        const { objects } = useGameStore.getState();
        const targets = objects.filter(o => o.type === type);
        if (targets.length === 0) return;

        // Remove the last one added (LIFO) or random? Random feels more natural for "thinning"
        const target = targets[Math.floor(Math.random() * targets.length)];

        const worker = getSimWorker();
        if (worker) {
            worker.postMessage({ type: 'REMOVE_OBJECT', payload: { objectId: target.id } });
        }
    };

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

    const objects: Array<{ type: ObjectType; icon: string; label: string; desc: string }> = [
        { type: 'water', icon: '💧', label: '水源', desc: '动物来此喝水补充渴值' },
        { type: 'bush', icon: '🌿', label: '灌木', desc: '鼠的庇护点，猫难以捕捉' },
        { type: 'trash', icon: '🗑️', label: '垃圾堆', desc: '鼠的食物来源，可刷新鼠' },
    ];

    return (
        <div className="panel rules-panel">
            <div className="panel-header">
                <span className="panel-icon">🌍</span>
                <h3>世界工具</h3>
            </div>

            <div className="panel-body">
                {/* 放置工具 */}
                <div className="form-group">
                    <label>放置物品</label>
                    <div className="object-list">
                        {objects.map(obj => (
                            <div
                                key={obj.type}
                                className={`object-item ${placeObjectType === obj.type && currentTool === 'place' ? 'active' : ''}`}
                            >
                                <div className="object-main" onClick={() => handlePlaceObject(obj.type)}>
                                    <span className="object-icon">{obj.icon}</span>
                                    <div className="object-info">
                                        <span className="object-label">{obj.label}</span>
                                        <span className="object-desc">{obj.desc}</span>
                                    </div>
                                </div>
                                <button
                                    className="quick-place-btn"
                                    onClick={() => handleQuickPlace(obj.type)}
                                    title="快速放置"
                                >
                                    +
                                </button>
                                <button
                                    className="quick-place-btn remove-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickRemove(obj.type);
                                    }}
                                    title="移除一个"
                                >
                                    -
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 调试选项 */}
                <div className="form-group">
                    <label>调试选项</label>
                    <div className="debug-options">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={rules.debug.showSenseRadius}
                                onChange={() => handleToggleDebug('showSenseRadius')}
                            />
                            显示感知范围
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={rules.debug.showTargets}
                                onChange={() => handleToggleDebug('showTargets')}
                            />
                            显示目标线
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={rules.debug.showChunkBounds}
                                onChange={() => handleToggleDebug('showChunkBounds')}
                            />
                            显示区块边界
                        </label>
                    </div>
                </div>
            </div>

            {/* V1.2 World Management */}
            <div className="form-group">
                <label>世界管理 (V1.2)</label>
                <div className="world-management">
                    <div className="seed-display">
                        <span>Seed:</span>
                        <code style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{seed}</code>
                    </div>
                    <div className="manage-buttons" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button className="tool-btn" onClick={handleExport} style={{ flex: 1, fontSize: '12px' }}>
                            📤 导出
                        </button>
                        <label className="tool-btn" style={{ flex: 1, fontSize: '12px', textAlign: 'center', cursor: 'pointer', margin: 0 }}>
                            📥 导入
                            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>
            </div>

            {/* 生态提示 */}
            <div className="panel-tips">
                <p>🌱 生态平衡提示：</p>
                <ul>
                    <li>多放灌木 → 鼠存活率提高</li>
                    <li>多放垃圾堆 → 鼠繁殖更快</li>
                    <li>水源不足 → 全体渴死风险</li>
                </ul>
            </div>
        </div>
    );
}
