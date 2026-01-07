// ============================================
// V1 世界规则面板
// ============================================

import { useGameStore, getSimWorker } from '../store/gameStore';
import type { ObjectType, WorldObject, TilePos } from '@shared/types';
import { V1 } from '@shared/constants';
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
    } = useGameStore();

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
        </div>
    );
}
