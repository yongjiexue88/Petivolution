// ============================================
// V1 Web Worker - 模拟入口
// ============================================

import {
    createSimulation,
    simulateTick,
    getSnapshot,
    getSelectedEntityDetail,
    type SimulationState
} from '../sim/core/tick';
import { spawnEntity, canSpawn } from '../sim/core/spawner';
import type {
    WorkerCommand,
    WorkerUpdate,
    SpeciesId,
    Personality,
    TilePos,
    WorldObject,
    WorldRule,
    WorldSaveData,
} from '../shared/types';
import { DEFAULT_WORLD_RULES } from '../shared/types';
import { V1 } from '../shared/constants';
import { v4 as uuid } from 'uuid';

let sim: SimulationState | null = null;
let tickInterval: ReturnType<typeof setInterval> | null = null;

// ============================================
// 消息处理
// ============================================

self.onmessage = (e: MessageEvent<WorkerCommand>) => {
    const cmd = e.data;

    switch (cmd.type) {
        case 'INIT_WORLD':
            handleInitWorld(cmd.payload);
            break;
        case 'LOAD_SAVE':
            handleLoadSave(cmd.payload);
            break;
        case 'SET_RULES':
            handleSetRules(cmd.payload);
            break;
        case 'SET_TIME_SCALE':
            handleSetTimeScale(cmd.payload);
            break;
        case 'SPAWN_ENTITY':
            handleSpawnEntity(cmd.payload);
            break;
        case 'PLACE_OBJECT':
            handlePlaceObject(cmd.payload);
            break;
        case 'REMOVE_OBJECT':
            handleRemoveObject(cmd.payload);
            break;
        case 'SELECT_ENTITY':
            handleSelectEntity(cmd.payload);
            break;
        case 'UPDATE_CAMERA':
            handleUpdateCamera(cmd.payload);
            break;
        case 'REQUEST_SAVE':
            handleRequestSave(cmd.payload);
            break;
        case 'RESET_WORLD':
            handleResetWorld(cmd.payload);
            break;
    }
};

// ============================================
// 命令处理器
// ============================================

function handleInitWorld(payload: {
    seed: number;
    mapId: string;
    rules: WorldRule;
    objects?: WorldObject[]
}) {
    sim = createSimulation(payload.seed, payload.mapId, payload.rules);

    // 添加初始对象
    if (payload.objects) {
        for (const obj of payload.objects) {
            sim.objects.set(obj.id, obj);
        }
    } else {
        // V1 Fishbowl: Initialize finite world with objects and animals
        sim.chunkManager.initializeWorld(sim);
    }

    startTickLoop();
    sendSnapshot();
}

function handleLoadSave(payload: { save: WorldSaveData }) {
    const save = payload.save;

    sim = createSimulation(save.world.seed, save.world.mapId, save.world.rules);
    sim.tick = save.world.tick;

    // 恢复对象
    for (const obj of save.objects) {
        sim.objects.set(obj.id, obj);
    }

    // 恢复实体
    for (const entity of save.entities) {
        sim.entities.set(entity.id, entity);
    }

    // 恢复墓地
    sim.graveyard = [...save.graveyard];

    startTickLoop();
    sendSnapshot();
}

function handleSetRules(payload: { rules: Partial<WorldRule> }) {
    if (!sim) return;
    sim.rules = { ...sim.rules, ...payload.rules };
}

function handleSetTimeScale(payload: { timeScale: 0 | 1 | 2 | 4 }) {
    if (!sim) return;
    sim.rules.timeScale = payload.timeScale;
}

function handleSpawnEntity(payload: {
    species: SpeciesId;
    name: string;
    personality: Personality;
    pos: TilePos
}) {
    if (!sim) return;

    if (!canSpawn(payload.species, sim)) {
        sendMessage({
            type: 'SPAWN_FAILED',
            payload: {
                reason: `${payload.species === 'cat' ? '猫' : '鼠'}数量已达上限`,
                species: payload.species
            }
        });
        return;
    }

    const entity = spawnEntity(
        sim,
        payload.species,
        payload.name,
        payload.personality,
        payload.pos
    );

    if (entity) {
        // 发送实体详情 (如果需要)
        console.log(`🐣 ${entity.name} (${entity.species}) was born!`);
    }
}

function handlePlaceObject(payload: { object: WorldObject }) {
    if (!sim) return;
    sim.objects.set(payload.object.id, payload.object);
}

function handleRemoveObject(payload: { objectId: string }) {
    if (!sim) return;
    sim.objects.delete(payload.objectId);
}

function handleSelectEntity(payload: { entityId?: string }) {
    if (!sim) return;
    sim.selectedEntityId = payload.entityId;

    // 立即发送选中实体详情
    if (payload.entityId) {
        const detail = getSelectedEntityDetail(sim);
        if (detail) {
            sendMessage({ type: 'ENTITY_DETAIL', payload: { entity: detail } });
        }
    }
}

function handleUpdateCamera(payload: { centerX: number; centerY: number; zoom: number }) {
    if (!sim) return;
    sim.cameraCenter = { x: payload.centerX, y: payload.centerY };
    sim.cameraZoom = payload.zoom;

    // V3: Update LOD when camera changes (recalculate visible chunks)
    sim.chunkManager.updateLOD(sim);
}

function handleRequestSave(payload: { saveName: string }) {
    if (!sim) return;

    const save: WorldSaveData = {
        schemaVersion: 1,
        meta: {
            saveId: uuid(),
            name: payload.saveName,
            createdAtIso: new Date().toISOString(),
            updatedAtIso: new Date().toISOString(),
            playTicks: sim.tick,
        },
        world: {
            seed: sim.seed,
            mapId: sim.mapId,
            tick: sim.tick,
            rules: sim.rules,
        },
        objects: Array.from(sim.objects.values()),
        entities: Array.from(sim.entities.values()),
        graveyard: sim.graveyard,
        chunks: Object.fromEntries(sim.chunkManager.chunks), // V3
    };

    sendMessage({ type: 'SAVE_READY', payload: { save } });
}

function handleResetWorld(payload: { seed?: number }) {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }

    const seed = payload.seed ?? Date.now();
    sim = createSimulation(seed, 'garden_v1', DEFAULT_WORLD_RULES);
    // V1 Fishbowl: Initialize finite world
    sim.chunkManager.initializeWorld(sim);

    startTickLoop();
    sendSnapshot();
}

// ============================================
// Tick 循环
// ============================================

function startTickLoop() {
    if (tickInterval) clearInterval(tickInterval);

    const msPerTick = 1000 / V1.simTickHz;
    let lastSnapshotTick = 0;

    tickInterval = setInterval(() => {
        if (!sim) return;

        simulateTick(sim);

        // 按快照频率发送
        const ticksSinceSnapshot = sim.tick - lastSnapshotTick;
        const snapshotInterval = V1.simTickHz / V1.snapshotHz;

        if (ticksSinceSnapshot >= snapshotInterval) {
            sendSnapshot();
            lastSnapshotTick = sim.tick;

            // 如果有选中实体，发送详情
            if (sim.selectedEntityId) {
                const detail = getSelectedEntityDetail(sim);
                if (detail) {
                    sendMessage({ type: 'ENTITY_DETAIL', payload: { entity: detail } });
                }
            }
        }
    }, msPerTick);
}

function sendSnapshot() {
    if (!sim) return;
    const snapshot = getSnapshot(sim);
    sendMessage({ type: 'SNAPSHOT', payload: snapshot });
}

function sendMessage(msg: WorkerUpdate) {
    self.postMessage(msg);
}

// ============================================
// 初始资源放置
// ============================================


