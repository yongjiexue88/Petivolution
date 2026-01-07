// ============================================
// V1 投放动物面板
// ============================================

import { useState } from 'react';
import { useGameStore, getSimWorker } from '../store/gameStore';
import type { SpeciesId, TilePos } from '@shared/types';
import { V1 } from '@shared/constants';
import './SpawnPanel.css';

// 随机名字库
const RAT_NAMES = ['小米', '花花', '点点', '豆豆', '毛毛', '圆圆', '跳跳', '灰灰', '胖胖', '乖乖'];
const CAT_NAMES = ['咪咪', 'Lucky', '橘子', '雪球', 'Tom', '虎子', '花卷', '布丁', '饼干', '团子'];

export function SpawnPanel() {
    const {
        spawnSpecies,
        setSpawnSpecies,
        spawnPersonality,
        setSpawnPersonality,
        currentTool,
        setCurrentTool,
        stats,
    } = useGameStore();

    const [customName, setCustomName] = useState('');

    const getRandomName = (species: SpeciesId): string => {
        const names = species === 'rat' ? RAT_NAMES : CAT_NAMES;
        const baseName = names[Math.floor(Math.random() * names.length)];
        return `${baseName}${Math.floor(Math.random() * 100)}`;
    };

    const handleQuickSpawn = () => {
        const worker = getSimWorker();
        if (!worker) return;

        const name = customName || getRandomName(spawnSpecies);
        const pos: TilePos = {
            tx: Math.floor(50 + Math.random() * 100),
            ty: Math.floor(50 + Math.random() * 100),
        };

        const cost = COSTS[spawnSpecies];
        const { godPower, spendGodPower } = useGameStore.getState();

        if (godPower < cost) {
            // Visual feedback handled by disabled button, but double check
            return;
        }

        spendGodPower(cost);

        worker.postMessage({
            type: 'SPAWN_ENTITY',
            payload: { species: spawnSpecies, name, personality: spawnPersonality, pos },
        });

        setCustomName('');
    };

    const handleStartPlacement = () => {
        setCurrentTool('spawn');
    };

    // V1.1 Costs
    const COSTS = { rat: 2, cat: 8 };

    const canAfford = (species: SpeciesId) => useGameStore.getState().godPower >= COSTS[species];


    // V1 Fishbowl: Show density target max as "cap" for UI
    const getCap = (species: SpeciesId) => V1.densityTargets[species].max;

    return (
        <div className="panel spawn-panel">
            <div className="panel-header">
                <span className="panel-icon">🐾</span>
                <h3>投放动物</h3>
            </div>

            <div className="panel-body">
                {/* 物种选择 */}
                <div className="form-group">
                    <label>选择物种</label>
                    <div className="species-buttons">
                        <button
                            className={`species-btn ${spawnSpecies === 'rat' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('rat')}
                            disabled={!canAfford('rat')}
                            style={{ opacity: canAfford('rat') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐭</span>
                            <span>鼠 (2GP)</span>
                            <span className="count">{stats.rat}/{getCap('rat')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'cat' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('cat')}
                            disabled={!canAfford('cat')}
                            style={{ opacity: canAfford('cat') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐱</span>
                            <span>猫 (8GP)</span>
                            <span className="count">{stats.cat}/{getCap('cat')}</span>
                        </button>
                    </div>
                </div>

                {/* 名字输入 */}
                <div className="form-group">
                    <label>名字 (可选)</label>
                    <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder={getRandomName(spawnSpecies)}
                        maxLength={12}
                    />
                </div>

                {/* 性格选择 */}
                <div className="form-group">
                    <label>性格</label>
                    <div className="personality-buttons">
                        <button
                            className={`personality-btn ${spawnPersonality === 'curious' ? 'active' : ''}`}
                            onClick={() => setSpawnPersonality('curious')}
                            title="爱探索新区域，寻找资源更积极"
                        >
                            🔍 好奇
                        </button>
                        <button
                            className={`personality-btn ${spawnPersonality === 'cautious' ? 'active' : ''}`}
                            onClick={() => setSpawnPersonality('cautious')}
                            title="更容易逃跑，偏好靠近庇护点"
                        >
                            🛡️ 谨慎
                        </button>
                        <button
                            className={`personality-btn ${spawnPersonality === 'brave' ? 'active' : ''}`}
                            onClick={() => setSpawnPersonality('brave')}
                            title="不容易逃跑，更敢于觅食"
                        >
                            ⚔️ 勇敢
                        </button>
                    </div>
                </div>

                {/* 操作按钮 */}
                <div className="action-buttons">
                    <button className="btn-primary" onClick={handleQuickSpawn}>
                        ✨ 快速投放
                    </button>
                    <button
                        className={`btn-secondary ${currentTool === 'spawn' ? 'active' : ''}`}
                        onClick={handleStartPlacement}
                    >
                        📍 点击地图放置
                    </button>
                </div>

                {/* 提示 */}
                <div className="panel-tips">
                    <p>💡 提示：</p>
                    <ul>
                        <li>鼠会从垃圾堆觅食，遇猫会逃</li>
                        <li>猫会追捕猎鼠，需要喝水</li>
                        <li>每种动物有数量上限</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
