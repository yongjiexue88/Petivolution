// ============================================
// V1 投放动物面板
// ============================================

import { useState } from 'react';
import { useGameStore, getSimWorker } from '../store/gameStore';
import { ServerClient } from '../api/ServerClient';
import type { SpeciesId, TilePos } from '@shared/types';
import { V1 } from '@shared/constants';
import './SpawnPanel.css';

// 随机名字库
const RAT_NAMES = ['小米', '花花', '点点', '豆豆', '毛毛', '圆圆', '跳跳', '灰灰', '胖胖', '乖乖'];
const CAT_NAMES = ['咪咪', 'Lucky', '橘子', '雪球', 'Tom', '虎子', '花卷', '布丁', '饼干', '团子'];
const CHICKEN_NAMES = ['咯咯', '小黄', '白白', '阿花', '咕咕'];
const BIRD_NAMES = ['啾啾', '蓝蓝', '小飞', '云云'];
const RACCOON_NAMES = ['浣浣', '熊熊', '面具', '小偷', '班迪'];
const CROW_NAMES = ['鸦鸦', '黑黑', '哇哇', '暗影'];
const DOG_NAMES = ['汪汪', '旺财', '大黄', '小白', '忠犬'];

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
        let names = RAT_NAMES;
        switch (species) {
            case 'cat': names = CAT_NAMES; break;
            case 'chicken': names = CHICKEN_NAMES; break;
            case 'smallBird': names = BIRD_NAMES; break;
            case 'raccoon': names = RACCOON_NAMES; break;
            case 'crow': names = CROW_NAMES; break;
            case 'dog': names = DOG_NAMES; break;
        }
        const baseName = names[Math.floor(Math.random() * names.length)];
        return `${baseName}${Math.floor(Math.random() * 100)}`;
    };

    const handleQuickSpawn = async () => {
        const { godPower, spendGodPower, useServer } = useGameStore.getState();

        const name = customName || getRandomName(spawnSpecies);
        const pos: TilePos = {
            tx: Math.floor(50 + Math.random() * 100),
            ty: Math.floor(50 + Math.random() * 100),
        };

        const cost = COSTS[spawnSpecies];

        if (godPower < cost) {
            return;
        }

        spendGodPower(cost);

        if (useServer) {
            // Convert tile pos back to pixels or just send tile pos?
            // The server API expects x, y in pixels (based on WorldServer.ts: Math.floor(x / V1.tileSizePx))
            const res = await ServerClient.getInstance().spawnAnimal(
                spawnSpecies,
                pos.tx * V1.tileSizePx,
                pos.ty * V1.tileSizePx
            );
            if (!res.ok) {
                console.warn('Server Quick Spawn Failed:', res.error);
            }
        } else {
            const worker = getSimWorker();
            if (!worker) return;

            worker.postMessage({
                type: 'SPAWN_ENTITY',
                payload: { species: spawnSpecies, name, personality: spawnPersonality, pos },
            });
        }

        setCustomName('');
    };

    const handleStartPlacement = () => {
        setCurrentTool('spawn');
    };

    // V1.1 Costs
    const COSTS: Record<SpeciesId, number> = {
        rat: 10,
        cat: 50,
        chicken: 20,
        smallBird: 15,
        raccoon: 35,
        crow: 15,
        dog: 60,
    };

    const canAfford = (species: SpeciesId) => useGameStore.getState().godPower >= COSTS[species];


    // V1 Fishbowl: Show density target max as "cap" for UI
    const getCap = (species: SpeciesId) => V1.densityTargets[species]?.max || 0; // Added fallback for safety

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

                        <button
                            className={`species-btn ${spawnSpecies === 'chicken' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('chicken')}
                            disabled={!canAfford('chicken')}
                            style={{ opacity: canAfford('chicken') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐔</span>
                            <span>鸡 (20GP)</span>
                            <span className="count">{stats.chicken}/{getCap('chicken')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'smallBird' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('smallBird')}
                            disabled={!canAfford('smallBird')}
                            style={{ opacity: canAfford('smallBird') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐦</span>
                            <span>鸟 (15GP)</span>
                            <span className="count">{stats.smallBird}/{getCap('smallBird')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'raccoon' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('raccoon')}
                            disabled={!canAfford('raccoon')}
                            style={{ opacity: canAfford('raccoon') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🦝</span>
                            <span>浣熊 (35GP)</span>
                            <span className="count">{stats.raccoon}/{getCap('raccoon')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'crow' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('crow')}
                            disabled={!canAfford('crow')}
                            style={{ opacity: canAfford('crow') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🦅</span>
                            <span>乌鸦 (15GP)</span>
                            <span className="count">{stats.crow}/{getCap('crow')}</span>
                        </button>
                        <button
                            className={`species-btn ${spawnSpecies === 'dog' ? 'active' : ''}`}
                            onClick={() => setSpawnSpecies('dog')}
                            disabled={!canAfford('dog')}
                            style={{ opacity: canAfford('dog') ? 1 : 0.5 }}
                        >
                            <span className="species-icon">🐕</span>
                            <span>狗 (60GP)</span>
                            <span className="count">{stats.dog}/{getCap('dog')}</span>
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
