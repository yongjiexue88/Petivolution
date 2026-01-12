// ============================================
// V1 Web Worker - Simulation Entry Point
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
// Message Handling
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
// Command Handlers
// ============================================

function handleInitWorld(payload: {
    seed: number;
    mapId: string;
    rules: WorldRule;
    objects?: WorldObject[]
}) {
    sim = createSimulation(payload.seed, payload.mapId, payload.rules);

    // Add initial objects
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

    // Restore objects
    for (const obj of save.objects) {
        sim.objects.set(obj.id, obj);
    }

    // Restore entities
    for (const entity of save.entities) {
        sim.entities.set(entity.id, entity);
    }

    // Restore graveyard
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
                reason: `${payload.species === 'cat' ? 'Cat' : 'Rat'} population limit reached`,
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
        // Send entity detail (if needed)
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

    // Immediately send selected entity detail
    if (payload.entityId) {
        const detail = getSelectedEntityDetail(sim);
        if (detail) {
            sendMessage({ type: 'ENTITY_DETAIL', payload: { entity: detail } });
        }
    }
}

function handleUpdateCamera(payload: { centerX: number; centerY: number; zoom: number; viewRectTiles?: { leftTx: number, topTy: number, rightTx: number, bottomTy: number } }) {
    if (!sim) return;
    sim.cameraCenter = { x: payload.centerX, y: payload.centerY };
    sim.cameraZoom = payload.zoom;
    if (payload.viewRectTiles) {
        sim.viewRectTiles = payload.viewRectTiles;
    }

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
// Tick Loop
// ============================================

function startTickLoop() {
    if (tickInterval) clearInterval(tickInterval);

    const msPerTick = 1000 / V1.simTickHz;
    let lastSnapshotTick = 0;

    tickInterval = setInterval(() => {
        if (!sim) return;

        simulateTick(sim);

        // Send by snapshot frequency
        const ticksSinceSnapshot = sim.tick - lastSnapshotTick;
        const snapshotInterval = V1.simTickHz / V1.snapshotHz;

        if (ticksSinceSnapshot >= snapshotInterval) {
            sendSnapshot();
            lastSnapshotTick = sim.tick;

            // If an entity is selected, send detail
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
// Initial Resource Placement
// ============================================
