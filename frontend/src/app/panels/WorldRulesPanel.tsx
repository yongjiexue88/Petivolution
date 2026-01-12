// ============================================
// V1 World Rules Panel
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
        togglePanel,
    } = useGameStore();

    const handlePlaceObject = (type: ObjectType) => {
        setPlaceObjectType(type);
        setCurrentTool('place');
    };

    // V1.1 Costs
    const COSTS: Record<ObjectType, number> = { water: 10, bush: 4, trash: 6, perch: 5 };
    const EMERGENCY_AID_COST = 15;
    const EMERGENCY_AID_CD = 120; // seconds

    const { godPower, spendGodPower, setCooldown, isCooldownReady } = useGameStore();

    const handleEmergencyAid = () => {
        if (!isCooldownReady('emergency_aid')) return;
        if (godPower < EMERGENCY_AID_COST) return;

        spendGodPower(EMERGENCY_AID_COST);
        setCooldown('emergency_aid', EMERGENCY_AID_CD);

        const worker = getSimWorker();
        // Simple "Rain" effect: Add 5 small waters randomly
        for (let i = 0; i < 5; i++) {
            const pos = { tx: Math.floor(20 + Math.random() * 160), ty: Math.floor(20 + Math.random() * 160) };
            const obj: WorldObject = {
                id: uuid(),
                type: 'water',
                pos,
                data: { resources: 50, maxResources: 50, regenRate: 0.1 }
            };
            worker?.postMessage({ type: 'PLACE_OBJECT', payload: { object: obj } });
        }
    };

    const handleQuickPlace = (type: ObjectType) => {
        const cost = COSTS[type];
        if (godPower < cost) return;
        spendGodPower(cost);

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
                regenRate: OBJECT_CONFIGS[type].regenRatePerTick,
                strength01: OBJECT_CONFIGS[type].strengthDefault || 1,
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



    const objects: Array<{ type: ObjectType; icon: string; label: string; desc: string }> = [
        { type: 'water', icon: '💧', label: 'Water (10GP)', desc: 'Animals drink here to restore thirst' },
        { type: 'bush', icon: '🌿', label: 'Bush (4GP)', desc: 'Shelter for rats, harder to catch' },
        { type: 'trash', icon: '🗑️', label: 'Trash Pile (6GP)', desc: 'Food source for rats' },
    ];

    return (
        <div className="panel rules-panel">
            <div className="panel-header">
                <span className="panel-icon">🌍</span>
                <h3>World Tools</h3>
                <button className="panel-close-btn" onClick={() => togglePanel('rules')}>×</button>
            </div>

            <div className="panel-body">
                {/* Emergency Aid */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>Divine Intervention</label>
                    <button
                        className="btn-primary emergency-btn"
                        onClick={handleEmergencyAid}
                        disabled={!isCooldownReady('emergency_aid') || godPower < EMERGENCY_AID_COST}
                        style={{
                            background: isCooldownReady('emergency_aid') ? 'linear-gradient(45deg, #3b82f6, #06b6d4)' : '#334155',
                            opacity: (isCooldownReady('emergency_aid') && godPower >= EMERGENCY_AID_COST) ? 1 : 0.5,
                            width: '100%',
                            padding: '10px'
                        }}
                    >
                        <span>🌧️ Emergency Rain (15GP)</span>
                        {!isCooldownReady('emergency_aid') && (
                            <span style={{ fontSize: '10px', marginLeft: '5px' }}>
                                (Cooldown {Math.ceil((useGameStore.getState().cooldowns['emergency_aid'] - Date.now()) / 1000)}s)
                            </span>
                        )}
                    </button>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                        Instantly spawns 5 small water sources, 120s cooldown
                    </div>
                </div>

                {/* Place Objects */}
                <div className="form-group">
                    <label>Place Objects</label>
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
                                    title="Quick Place"
                                >
                                    +
                                </button>
                                <button
                                    className="quick-place-btn remove-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleQuickRemove(obj.type);
                                    }}
                                    title="Remove One"
                                >
                                    -
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Debug Options */}

            </div>

            {/* Ecology Tips */}
            <div className="panel-tips">
                <p>🌱 Ecology Balance Tips:</p>
                <ul>
                    <li>More bushes → Higher rat survival rate</li>
                    <li>More trash piles → Faster rat reproduction</li>
                    <li>Insufficient water → Risk of mass dehydration</li>
                </ul>
            </div>
        </div>
    );
}
