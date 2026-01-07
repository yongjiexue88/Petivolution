// ============================================
// V1 游戏状态管理 (Zustand)
// ============================================

import { create } from 'zustand';
import type {
    SnapshotEntity,
    WorldObject,
    SimStats,
    EntityRuntime,
    SpeciesId,
    Personality,
    ObjectType,
    WorldRule,
    GraveyardEntry,
} from '@shared/types';
import { DEFAULT_WORLD_RULES } from '@shared/types';
import { V1 } from '@shared/constants';

// ============================================
// 状态类型
// ============================================

export interface GameState {
    // 初始化状态
    initialized: boolean;

    // 世界状态 (从 Worker 接收)
    tick: number;
    entities: SnapshotEntity[];
    objects: WorldObject[];
    stats: SimStats;
    graveyard: GraveyardEntry[];

    // 选中实体详情
    selectedEntityId: string | null;
    selectedEntityDetail: EntityRuntime | null;

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

    // 世界规则
    rules: WorldRule;

    // Actions
    setInitialized: (initialized: boolean) => void;
    updateFromSnapshot: (data: {
        tick: number;
        entities: SnapshotEntity[];
        objects: WorldObject[];
        stats: SimStats;
    }) => void;
    addToGraveyard: (entry: GraveyardEntry) => void;
    setSelectedEntityId: (id: string | null) => void;
    setSelectedEntityDetail: (entity: EntityRuntime | null) => void;
    setCurrentTool: (tool: 'select' | 'spawn' | 'place' | 'delete') => void;
    setSpawnSpecies: (species: SpeciesId) => void;
    setSpawnPersonality: (personality: Personality) => void;
    setPlaceObjectType: (type: ObjectType) => void;
    togglePanel: (panel: 'spawn' | 'rules' | 'graveyard' | 'debug') => void;
    setRules: (rules: Partial<WorldRule>) => void;
    setTimeScale: (scale: 0 | 1 | 2 | 4) => void;
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
    entities: [],
    objects: [],
    stats: { rat: 0, cat: 0, deathsLastMin: 0, birthsLastMin: 0 },
    graveyard: [],

    selectedEntityId: null,
    selectedEntityDetail: null,

    currentTool: 'select',
    spawnSpecies: 'rat',
    spawnPersonality: 'curious',
    placeObjectType: 'water',

    showSpawnPanel: true,
    showRulesPanel: false,
    showGraveyardPanel: false,
    showDebugPanel: false,

    rules: DEFAULT_WORLD_RULES,

    // Actions
    setInitialized: (initialized) => set({ initialized }),

    updateFromSnapshot: (data) => set({
        tick: data.tick,
        entities: data.entities,
        objects: data.objects,
        stats: data.stats,
    }),

    addToGraveyard: (entry) => set((state) => ({
        graveyard: [...state.graveyard, entry],
    })),

    setSelectedEntityId: (id) => set({ selectedEntityId: id }),

    setSelectedEntityDetail: (entity) => set({ selectedEntityDetail: entity }),

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
}));
