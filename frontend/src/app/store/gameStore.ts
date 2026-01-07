// ============================================
// V1 游戏状态管理 (Zustand)
// ============================================

import { create } from 'zustand';
import type { EntityRuntime, SnapshotEntity, SimEvent, GraveyardEntry, SimStats, WorldSaveData, EntityId, SpeciesId, Personality, ObjectType } from '@shared/types';
import { WorldObject, WorldRule } from '@shared/types';
import { DEFAULT_WORLD_RULES } from '@shared/types';
import { ServerClient } from '../api/ServerClient';

// ============================================
// 状态类型
// ============================================

export interface GameState {
    // 初始化状态
    initialized: boolean;

    // 世界状态 (从 Worker 接收)
    tick: number;
    seed: number; // V1.2
    entities: SnapshotEntity[];
    objects: WorldObject[];
    events: SimEvent[];
    stats: SimStats;
    graveyard: GraveyardEntry[];

    // 选中实体详情
    selectedEntityId: string | null;
    selectedEntityDetail: EntityRuntime | null;

    // V1.1 Path Trace
    viewingGravePathId: string | null;
    cameraFlyTo: { x: number; y: number } | null; // V1.1
    followingEntityId: string | null; // V1.1 Follow Mode

    // V1.1 God Mode State
    godPower: number;
    maxGodPower: number;
    lastRestoredTick: number;
    cooldowns: Record<string, number>;

    // V1.1 Challenges
    activeChallengeId: string | null;
    challengeStartTime: number | null;
    challengeState: 'active' | 'won' | 'lost' | null;

    // V1.3 Server Mode
    useServer: boolean;
    setUseServer: (enabled: boolean) => void;
    connected: boolean;
    latency: number;
    setConnectionStatus: (connected: boolean, latency: number) => void;

    // UI 状态
    currentTool: 'select' | 'spawn' | 'place' | 'delete';
    spawnSpecies: SpeciesId;
    spawnPersonality: Personality;
    placeObjectType: ObjectType;

    // 面板显示
    showSpawnPanel: boolean;
    showRulesPanel: boolean;
    showGraveyardPanel: boolean;
    showDebugPanel: boolean;
    showEventLog: boolean;

    // 世界规则
    rules: WorldRule;

    // Actions
    setInitialized: (initialized: boolean) => void;
    updateFromSnapshot: (data: {
        tick: number;
        entities: SnapshotEntity[];
        objects: WorldObject[];
        stats: SimStats;
        events: SimEvent[];
    }) => void;
    addToGraveyard: (entry: GraveyardEntry) => void;
    setSelectedEntityId: (id: string | null) => void;
    setSelectedEntityDetail: (entity: EntityRuntime | null) => void;
    setViewGravePath: (id: string | null) => void;
    setCameraFlyTo: (pos: { x: number; y: number } | null) => void;
    setFollowingEntityId: (id: string | null) => void;
    setCurrentTool: (tool: 'select' | 'spawn' | 'place' | 'delete') => void;
    setSpawnSpecies: (species: SpeciesId) => void;
    setSpawnPersonality: (personality: Personality) => void;
    setPlaceObjectType: (type: ObjectType) => void;
    togglePanel: (panel: 'spawn' | 'rules' | 'graveyard' | 'debug' | 'eventLog') => void;
    setRules: (rules: Partial<WorldRule>) => void;
    setTimeScale: (scale: 0 | 1 | 2 | 4) => void;

    // V1.2 Save & Share
    exportWorld: () => WorldSaveData;
    importWorld: (data: WorldSaveData) => void;

    // V1.1 God Mode Actions
    spendGodPower: (amount: number) => boolean;
    setCooldown: (key: string, durationSec: number) => void;
    isCooldownReady: (key: string) => boolean;

    // V1.1 Challenges
    startChallenge: (id: string) => void;
    stopChallenge: () => void;
    setChallengeState: (state: 'active' | 'won' | 'lost') => void;
}

// ============================================
// Worker 引用 (独立于 store)
// ============================================

let simWorker: Worker | null = null;

export function setSimWorker(worker: Worker) {
    simWorker = worker;
}

export function getSimWorker(): Worker | null {
    return simWorker;
}

// ============================================
// Store
// ============================================

export const useGameStore = create<GameState>((set, get) => ({
    // 初始状态
    initialized: false,
    tick: 0,
    seed: 0,
    entities: [],
    objects: [],
    events: [],
    stats: { rat: 0, cat: 0, deathsLastMin: 0, birthsLastMin: 0 },
    graveyard: [],
    chunks: {}, // V3


    selectedEntityId: null,
    selectedEntityDetail: null,
    viewingGravePathId: null,
    cameraFlyTo: null,
    followingEntityId: null,

    currentTool: 'select',
    spawnSpecies: 'rat',
    spawnPersonality: 'curious',
    placeObjectType: 'water',

    showSpawnPanel: true,
    showRulesPanel: false,
    showGraveyardPanel: false,
    showDebugPanel: false,
    showEventLog: true,

    // V1.1 God Mode Init
    godPower: 60, // Start with 60
    maxGodPower: 100,
    lastRestoredTick: 0,
    cooldowns: {},

    activeChallengeId: null,
    challengeStartTime: null,
    challengeState: null,

    // V1.3 Server Init
    useServer: true, // Default to Server Mode for V1.3
    connected: false,
    latency: 0,

    rules: DEFAULT_WORLD_RULES,

    // V1.1 God Mode Actions
    spendGodPower: (amount) => {
        const state = get();
        if (state.godPower >= amount) {
            set({ godPower: state.godPower - amount });
            return true;
        }
        return false;
    },

    setCooldown: (key, durationSec) => set((state) => ({
        cooldowns: { ...state.cooldowns, [key]: Date.now() + durationSec * 1000 }
    })),

    isCooldownReady: (key) => {
        const state = get();
        const readyAt = state.cooldowns[key] || 0;
        return Date.now() >= readyAt;
    },

    // V1.1 Challenge Actions
    startChallenge: (id) => set({
        activeChallengeId: id,
        challengeStartTime: Date.now(),
        challengeState: 'active'
    }),
    stopChallenge: () => set({
        activeChallengeId: null,
        challengeStartTime: null,
        challengeState: null
    }),
    setChallengeState: (state) => set({ challengeState: state }),

    // V1.3 Server Actions
    setUseServer: (enabled) => set({ useServer: enabled }),
    setConnectionStatus: (connected, latency) => set({ connected, latency }),

    // Actions
    setInitialized: (initialized) => set({ initialized }),

    updateFromSnapshot: (data) => set((state) => {
        // 合并新事件，只保留最近 50 条
        const newEvents = [...state.events, ...data.events].slice(-50);

        // V1.1 God Power Regen: 1 per 3 seconds.
        // Snapshot is ~100ms (10Hz). 30 snapshots = 3s.
        // Regen 0.0333 per snapshot.
        let newGp = state.godPower;
        if (newGp < state.maxGodPower) {
            newGp = Math.min(state.maxGodPower, newGp + 0.0333);
        }


        return {
            tick: data.tick,
            seed: data.stats.currentSeed || 0, // Sync seed
            entities: data.entities,
            objects: data.objects,
            stats: data.stats,
            events: newEvents,
            godPower: newGp,

        };
    }),

    addToGraveyard: (entry) => set((state) => ({
        graveyard: [...state.graveyard, entry],
    })),

    setSelectedEntityId: (id) => set({ selectedEntityId: id }),

    setSelectedEntityDetail: (entity) => set({ selectedEntityDetail: entity }),

    setViewGravePath: (id) => set({ viewingGravePathId: id }),

    setCameraFlyTo: (pos) => set({ cameraFlyTo: pos }),

    setFollowingEntityId: (id) => set({ followingEntityId: id }),

    setCurrentTool: (tool) => set({ currentTool: tool }),

    setSpawnSpecies: (species) => set({ spawnSpecies: species }),

    setSpawnPersonality: (personality) => set({ spawnPersonality: personality }),

    setPlaceObjectType: (type) => set({ placeObjectType: type }),

    togglePanel: (panel) => set((state) => {
        switch (panel) {
            case 'spawn':
                return { showSpawnPanel: !state.showSpawnPanel };
            case 'rules':
                return { showRulesPanel: !state.showRulesPanel };
            case 'graveyard':
                return { showGraveyardPanel: !state.showGraveyardPanel };
            case 'debug':
                return { showDebugPanel: !state.showDebugPanel };
            case 'eventLog':
                return { showEventLog: !state.showEventLog };
            default:
                return {};
        }
    }),

    setRules: (rules) => set((state) => ({
        rules: { ...state.rules, ...rules },
    })),

    setTimeScale: (scale) => set((state) => ({
        rules: { ...state.rules, timeScale: scale },
    })),

    // V1.2 Save & Share
    exportWorld: () => {
        const state = get();
        return {
            schemaVersion: 1,
            meta: {
                saveId: 'export-' + Date.now(),
                name: 'Exported World',
                createdAtIso: new Date().toISOString(),
                updatedAtIso: new Date().toISOString(),
                playTicks: state.tick,
            },
            world: {
                // V1.2 TODO: Get real seed from worker or store
                seed: state.seed,
                mapId: 'garden_v1',
                tick: state.tick,
                rules: state.rules,
            },
            objects: state.objects,
            // Note: SnapshotEntity[] is not fully compatible with EntityRuntime[], but for visual replay/export it might suffice
            // or we need to request full save from worker.
            // Casting to any to fix build for now.
            entities: state.entities as unknown as EntityRuntime[],
            graveyard: state.graveyard,
            chunks: {}, // V3 TODO: Serialize from worker
        };
    },

    importWorld: (data) => {
        set({
            tick: data.world.tick,
            rules: data.world.rules,
            entities: data.entities as unknown as SnapshotEntity[], // SnapshotEntity mismatch
            objects: data.objects,
            stats: { rat: 0, cat: 0, deathsLastMin: 0, birthsLastMin: 0, currentSeed: data.world.seed }, // Reset stats but keep seed
            graveyard: data.graveyard,
            chunks: data.chunks || {}, // V3
            events: [], // Clear events on load
            selectedEntityId: null,
            selectedEntityDetail: null,
            viewingGravePathId: null,
        });

        const worker = getSimWorker();
        if (worker) {
            worker.postMessage({ type: 'LOAD_WORLD', payload: data });
        }
    },
}));
