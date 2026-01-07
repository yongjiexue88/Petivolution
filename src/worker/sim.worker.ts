// ============================================
// V1 Web Worker - 模拟入口
// ============================================

import {
    createSimulation,
    simulateTick,
    getSnapshot,
    getSelectedEntityDetail,
    spawnEntity,
    canSpawn,
    type SimulationState
} from '../sim/core/tick';
import type {
    WorkerCommand,
    WorkerUpdate,
    SpeciesId,
    Personality,
    TilePos,
    WorldObject,
    WorldRule,
    SaveFileV1,
} from '../shared/types';
import { DEFAULT_WORLD_RULES } from '../shared/types';
import { V1 } from '../shared/constants';
import { OBJECT_CONFIGS } from '../shared/species.config';
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
        placeInitialResources();
    }

    startTickLoop();
    sendSnapshot();
}

function handleLoadSave(payload: { save: SaveFileV1 }) {
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
}

function handleRequestSave(payload: { saveName: string }) {
    if (!sim) return;

    const save: SaveFileV1 = {
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
    placeInitialResources();
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

function placeInitialResources() {
    if (!sim) return;

    const mapPixelWidth = V1.defaultMapWidth * V1.tileSizePx;
    const mapPixelHeight = V1.defaultMapHeight * V1.tileSizePx;

    // 放置水源 (5个)
    for (let i = 0; i < 5; i++) {
        const tx = Math.floor(10 + sim.rng() * (V1.defaultMapWidth - 20));
        const ty = Math.floor(10 + sim.rng() * (V1.defaultMapHeight - 20));

        const obj: WorldObject = {
            id: uuid(),
            type: 'water',
            pos: { tx, ty },
            data: {
                resources: OBJECT_CONFIGS.water.maxResources,
                maxResources: OBJECT_CONFIGS.water.maxResources,
                regenRate: OBJECT_CONFIGS.water.regenRate,
            },
        };
        sim.objects.set(obj.id, obj);
    }

    // 放置灌木 (8个)
    for (let i = 0; i < 8; i++) {
        const tx = Math.floor(5 + sim.rng() * (V1.defaultMapWidth - 10));
        const ty = Math.floor(5 + sim.rng() * (V1.defaultMapHeight - 10));

        const obj: WorldObject = {
            id: uuid(),
            type: 'bush',
            pos: { tx, ty },
            data: {
                strength01: OBJECT_CONFIGS.bush.strengthDefault,
            },
        };
        sim.objects.set(obj.id, obj);
    }

    // 放置垃圾堆 (6个)
    for (let i = 0; i < 6; i++) {
        const tx = Math.floor(8 + sim.rng() * (V1.defaultMapWidth - 16));
        const ty = Math.floor(8 + sim.rng() * (V1.defaultMapHeight - 16));

        const obj: WorldObject = {
            id: uuid(),
            type: 'trash',
            pos: { tx, ty },
            data: {
                resources: OBJECT_CONFIGS.trash.maxResources,
                maxResources: OBJECT_CONFIGS.trash.maxResources,
                regenRate: OBJECT_CONFIGS.trash.regenRate,
            },
        };
        sim.objects.set(obj.id, obj);
    }
}
