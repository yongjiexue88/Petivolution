import { useEffect, useRef } from 'react';
import { useGameStore, setSimWorker } from './store/gameStore';
import { GameCanvas } from './components/GameCanvas';
import { SpawnPanel } from './panels/SpawnPanel';
import { AnimalDetailPanel } from './panels/AnimalDetailPanel';
import { WorldRulesPanel } from './panels/WorldRulesPanel';
import { GraveyardPanel } from './panels/GraveyardPanel';
import { EventLogPanel } from './panels/EventLogPanel';
import { Toolbar } from './components/Toolbar';
import type { WorkerUpdate } from '@shared/types';
import { DEFAULT_WORLD_RULES } from '@shared/types';
import './App.css';

function App() {
    const workerRef = useRef<Worker | null>(null);
    const {
        setInitialized,
        updateFromSnapshot,
        addToGraveyard,
        setSelectedEntityDetail,
        showSpawnPanel,
        showRulesPanel,
        showGraveyardPanel,
        showEventLog,
        // selectedEntityId,
        selectedEntityDetail,
        // entities,
        stats,
        tick,
    } = useGameStore();

    // 初始化 Web Worker
    useEffect(() => {
        const worker = new Worker(
            new URL('../worker/sim.worker.ts', import.meta.url),
            { type: 'module' }
        );

        workerRef.current = worker;
        setSimWorker(worker);

        // 处理Worker消息
        worker.onmessage = (e: MessageEvent<WorkerUpdate>) => {
            const msg = e.data;

            switch (msg.type) {
                case 'SNAPSHOT':
                    updateFromSnapshot(msg.payload);
                    break;

                case 'ENTITY_DETAIL':
                    setSelectedEntityDetail(msg.payload.entity);
                    break;

                case 'SPAWN_FAILED':
                    console.warn(`⚠️ 投放失败: ${msg.payload.reason}`);
                    break;

                case 'SAVE_READY':
                    console.log('💾 存档已生成:', msg.payload.save.meta.name);
                    // TODO: 保存到 IndexedDB
                    break;

                case 'ERROR':
                    console.error('Sim Worker Error:', msg.payload.message);
                    break;
            }
        };

        // 初始化世界
        worker.postMessage({
            type: 'INIT_WORLD',
            payload: {
                seed: Date.now(),
                mapId: 'garden_v1',
                rules: DEFAULT_WORLD_RULES,
            }
        });

        setInitialized(true);

        return () => {
            worker.terminate();
        };
    }, [setInitialized, updateFromSnapshot, setSelectedEntityDetail, addToGraveyard]);

    // 获取选中实体
    // const selectedEntity = selectedEntityId
    //     ? entities.find(e => e.id === selectedEntityId)
    //     : null;

    return (
        <div className="app">
            {/* 游戏画布 */}
            <GameCanvas />

            {/* 工具栏 */}
            <Toolbar />

            {/* 左侧面板 */}
            <div className="panels-left">
                {showSpawnPanel && <SpawnPanel />}
                {showRulesPanel && <WorldRulesPanel />}
                {showEventLog && <EventLogPanel />}
            </div>

            {/* 右侧面板 */}
            <div className="panels-right">
                {selectedEntityDetail && (
                    <AnimalDetailPanel entity={selectedEntityDetail} />
                )}
                {showGraveyardPanel && <GraveyardPanel />}
            </div>

            {/* 状态栏 */}
            <div className="status-bar">
                <span>🐭 鼠: {stats.rat}</span>
                <span>🐱 猫: {stats.cat}</span>
                <span>⚰️ 死亡/分: {stats.deathsLastMin}</span>
                <span>🐣 出生/分: {stats.birthsLastMin}</span>
                <span>🕐 Tick: {tick}</span>
            </div>
        </div>
    );
}

export default App;
