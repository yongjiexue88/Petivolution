import { useEffect, useRef } from 'react';
import { useGameStore, setSimWorker } from './store/gameStore';
import { GameCanvas } from './components/GameCanvas';
import { SpawnPanel } from './panels/SpawnPanel';
import { AnimalDetailPanel } from './panels/AnimalDetailPanel';
import { WorldRulesPanel } from './panels/WorldRulesPanel';
import { GraveyardPanel } from './panels/GraveyardPanel';
import { EventLogPanel } from './panels/EventLogPanel';
import { ChallengePanel } from './panels/ChallengePanel';
import { DebugPanel } from './panels/DebugPanel';
import { Toolbar } from './components/Toolbar';
import type { WorkerUpdate } from '@shared/types';
import { DEFAULT_WORLD_RULES } from '@shared/types';
import { ServerClient } from './api/ServerClient';
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
        showChallengePanel,
        showDebugPanel,
        // selectedEntityId,
        // selectedEntityId,
        selectedEntityDetail,
        // entities,
        useServer, // V1.3
        setConnectionStatus, // V1.3
        showHUD,
        toggleHUD
    } = useGameStore();

    // Hotkey Listener (Shift+D to Toggle HUD)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
                toggleHUD();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleHUD]);

    // Initialize Web Worker or connect to server
    useEffect(() => {
        let worker: Worker | null = null;
        let pollInterval: any = null;

        if (useServer) {
            console.log("🔌 Connecting to V1.3 Server...");

            // Polling Loop
            pollInterval = setInterval(async () => {
                const snapshot = await ServerClient.getInstance().getSnapshot();
                if (snapshot) {
                    setConnectionStatus(true, ServerClient.getInstance().lastLatencyMs);
                    updateFromSnapshot(snapshot);
                    setInitialized(true);
                } else {
                    setConnectionStatus(false, 0);
                }
            }, 200); // 5Hz Polling (Start at 200ms)

        } else {
            console.log("🧵 Starting Local Worker...");
            worker = new Worker(
                new URL('../worker/sim.worker.ts', import.meta.url),
                { type: 'module' }
            );

            workerRef.current = worker;
            setSimWorker(worker);

            // Handle Worker messages
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
                        console.warn(`⚠️ Spawn failed: ${msg.payload.reason}`);
                        break;

                    case 'SAVE_READY':
                        console.log('💾 Save ready:', msg.payload.save.meta.name);
                        // TODO: Save to IndexedDB
                        break;

                    case 'ERROR':
                        console.error('Sim Worker Error:', msg.payload.message);
                        break;
                }
            };

            // Initialize world
            worker.postMessage({
                type: 'INIT_WORLD',
                payload: {
                    seed: Date.now(),
                    mapId: 'garden_v1',
                    rules: DEFAULT_WORLD_RULES,
                }
            });

            setInitialized(true);
        }

        return () => {
            if (worker) worker.terminate();
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [useServer, setInitialized, updateFromSnapshot, setSelectedEntityDetail, addToGraveyard, setConnectionStatus]);

    // Get selected entity
    // const selectedEntity = selectedEntityId
    //     ? entities.find(e => e.id === selectedEntityId)
    //     : null;

    return (
        <div className="app">
            {/* Game Canvas */}
            <GameCanvas />

            {/* Toolbar */}
            {showHUD && <Toolbar />}

            {/* Left Panels */}
            <div className="panels-left">
                {showSpawnPanel && <SpawnPanel />}
                {showRulesPanel && <WorldRulesPanel />}
                {showEventLog && <EventLogPanel />}
                {showChallengePanel && <ChallengePanel />}
            </div>

            {/* Right Panels */}
            <div className="panels-right">
                {showDebugPanel && <DebugPanel />}
                {selectedEntityDetail && (
                    <AnimalDetailPanel entity={selectedEntityDetail} />
                )}
                {showGraveyardPanel && <GraveyardPanel />}
            </div>
        </div>
    );
}

export default App;
