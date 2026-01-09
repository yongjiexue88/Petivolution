// ============================================
// V1 完整类型定义
// ============================================

// ============================================
// 基础类型
// ============================================

export type SpeciesId = 'rat' | 'cat' | 'chicken' | 'smallBird' | 'raccoon' | 'crow' | 'dog' | 'fox' | 'hawk' | 'wolf' | 'snake';
export type ObjectType = 'water' | 'bush' | 'trash' | 'perch';

export type Vec2 = { x: number; y: number };
export type TilePos = { tx: number; ty: number };

export type TimeScale = 0 | 1 | 2 | 4;

export type EntityId = string;
export type ObjectId = string;
export type ChunkId = string; // "x,y" e.g. "0,0", "-1,2"

export type Personality = 'curious' | 'cautious' | 'brave';

export type SimState =
    | 'idle'
    | 'wander'
    | 'moveTo'
    | 'drink'
    | 'eat'
    | 'chase'
    | 'attack'
    | 'flee'
    | 'sleep'
    | 'peck'    // V4: Chicken foraging
    | 'perch'   // V4: Bird resting
    | 'hop'     // V4: Bird movement
    | 'rummage' // V1.3 Raccoonrd movement
    | 'bark'    // Dog guardian behavior
    | 'patrol'  // Dog area guarding
    | 'dead';

export type Facing = 'n' | 's' | 'e' | 'w';

export type Goal = 'drink' | 'eat' | 'hunt' | 'rest' | 'flee' | 'wander' | 'forage' | 'rummage' | 'bark' | 'patrol';

// ============================================
// Vitals (生命体征)
// ============================================

export type Vitals = {
    hunger01: number;  // 0..1 (1=饱，0=饿死边缘)
    thirst01: number;  // 0..1
    fatigue01: number; // 0..1 (1=精力充足，0=困到崩)
    health01: number;  // 0..1
};

// ============================================
// Stimulus (刺激)
// ============================================

export type Stimulus =
    | { type: 'prey'; entityId: EntityId; dist: number }
    | { type: 'predator'; entityId: EntityId; dist: number }
    | { type: 'water'; objectId: ObjectId; dist: number }
    | { type: 'bush'; objectId: ObjectId; dist: number }
    | { type: 'trash'; objectId: ObjectId; dist: number }
    | { type: 'perch'; objectId: ObjectId; dist: number }
    | { type: 'friend'; entityId: EntityId; dist: number }
    | { type: 'intruder'; entityId: EntityId; dist: number };

// ============================================
// Entity AI 状态 (可解释性)
// ============================================

export type EntityAI = {
    lastPerceptionTick: number;
    lastDecisionTick: number;

    // 最近一次决策结果（UI展示）
    currentGoal: Goal;

    // 最近一次打分（UI展示）
    lastUtilityScores: Partial<Record<Goal, number>>;

    // 最近刺激（UI展示，限制长度）
    recentStimuli: Stimulus[];

    // 当前动作失败原因（调试&UI）
    lastFailReason?: string;

    // 决策上下文（UI展示"为什么"）
    decisionContext?: {
        goal: string;
        targetId?: string; // 追逐/互动目标
        threatId?: string; // 逃跑来源
        distance?: number; // 距离目标/威胁
        reason?: string;   // 文字描述 (Optional)
    };
};

// ============================================
// Entity (动物实体)
// ============================================

export type EntityRuntime = {
    id: EntityId;
    species: SpeciesId;
    name: string;
    personality: Personality;

    pos: Vec2;         // tile坐标
    vel: Vec2;         // tile/tick
    facing: Facing;

    vitals: Vitals;
    ageTicks: number;

    state: SimState;

    // 目标（当前动作执行对象）
    targetEntityId?: EntityId;
    targetObjectId?: ObjectId;
    targetPos?: Vec2;

    // AI 可解释性（UI显示"它为什么这么做"）
    ai: EntityAI;

    // V2 Family
    parents: EntityId[];
    children: EntityId[];
    generation: number;
    lastReproductionTick?: number; // V2

    // V1.1 History & Path
    history: SimEvent[];
    path: Vec2[];

    // 战斗（V1猫抓鼠可极简）
    combat?: {
        attackCooldownTicks: number;
    };

    // 追逐追踪
    chaseTicks?: number;
    chaseStartPos?: Vec2;

    // 死亡记录
    dead?: {
        atTick: number;
        reason: 'starvation' | 'dehydration' | 'killed' | 'unknown';
        killedBy?: EntityId;
    };
};

// ============================================
// WorldObject (可放置对象)
// ============================================

export type WorldObject = {
    id: ObjectId;
    type: ObjectType;
    pos: TilePos;

    data?: {
        strength01?: number;   // 0..1 (灌木庇护强度)
        regenRate?: number;    // 每tick恢复量
        resources?: number;    // 当前资源量
        maxResources?: number; // 最大资源量
    };
};

// ============================================
// WorldRule (世界规则)
// ============================================

export type WorldRule = {
    // 时间缩放
    timeScale: TimeScale;

    // 生态稳定器
    capsEnabled: boolean;
    capPerChunk: Record<SpeciesId, number>;

    // 刷新/资源
    trashSpawnsRats: boolean;
    ratSpawn: {
        enabled: boolean;
        perTrashEveryTicks: number;
        probability: number;
        minRatsNearbyToStop: number;
        maxRatsNearby: number;
    };

    // 死亡与难度
    deathEnabled: boolean;

    // AI 强度开关
    ai: {
        perceptionEnabled: boolean;
        useCoverForRats: boolean;
        chaseTimeoutTicks: number;
    };

    // 调试开关（UI）
    debug: {
        showSenseRadius: boolean;
        showTargets: boolean;
        showPaths: boolean;
        showChunkBounds: boolean;
    };

    // V4 Challenges
    challenge?: {
        enabled: boolean;
        title: string;
        description: string;
        targetDurationTicks: number; // e.g. 5 mins = 4500 ticks
        minPopulation?: Partial<Record<SpeciesId, number>>;
        maxPopulation?: Partial<Record<SpeciesId, number>>;
    };
};

// ============================================
// Save (存档格式)
// ============================================

export type GraveyardEntry = {
    entityId: EntityId;
    species: SpeciesId;
    name: string;
    personality: Personality;
    bornTick: number;
    deadTick: number;
    reason: 'starvation' | 'dehydration' | 'killed' | 'unknown';
    killedByName?: string;
    history: SimEvent[]; // V1.1
    path: Vec2[];        // V1.1
};

export type WorldSaveData = {
    schemaVersion: 1;

    meta: {
        saveId: string;
        name: string;
        createdAtIso: string;
        updatedAtIso: string;
        playTicks: number;
    };

    world: {
        seed: number;
        mapId: string;
        tick: number;
        rules: WorldRule;
    };

    objects: WorldObject[];
    entities: EntityRuntime[];
    graveyard: GraveyardEntry[];
    chunks: Record<ChunkId, ChunkData>; // V3
};

// ============================================
// V3 Chunk System
// ============================================

export type ChunkState = 'active' | 'semi_active' | 'far';

export type ChunkStats = {
    counts: Partial<Record<SpeciesId, number>>;
    resourceLevel: number; // 0..1 generic resource index
    dangerLevel: number;   // 0..1 generic danger index
    lastTick: number;      // Last time this chunk was updated
};

export type ChunkData = {
    id: ChunkId;
    x: number;
    y: number;
    stats: ChunkStats;
    // When virtualized, we might store partial state here if needed
    // For now, entities are either in 'sim.entities' (Active/Semi) or just 'stats' (Far)
};

// ============================================
// Worker 通信协议
// ============================================

// Main -> Worker
export type WorkerCommand =
    | { type: 'INIT_WORLD'; payload: { seed: number; mapId: string; rules: WorldRule; objects?: WorldObject[] } }
    | { type: 'LOAD_SAVE'; payload: { save: WorldSaveData } }
    | { type: 'SET_RULES'; payload: { rules: Partial<WorldRule> } }
    | { type: 'SET_TIME_SCALE'; payload: { timeScale: TimeScale } }
    | { type: 'SPAWN_ENTITY'; payload: { species: SpeciesId; name: string; personality: Personality; pos: TilePos } }
    | { type: 'PLACE_OBJECT'; payload: { object: WorldObject } }
    | { type: 'REMOVE_OBJECT'; payload: { objectId: ObjectId } }
    | { type: 'SELECT_ENTITY'; payload: { entityId?: EntityId } }
    | { type: 'UPDATE_CAMERA'; payload: { centerX: number; centerY: number; zoom: number; viewRectTiles?: { leftTx: number; topTy: number; rightTx: number; bottomTy: number } } }
    | { type: 'REQUEST_SAVE'; payload: { saveName: string } }
    | { type: 'RESET_WORLD'; payload: { seed?: number } };

// Snapshot Entity (只发渲染需要的字段)
export type SnapshotEntity = {
    id: EntityId;
    species: SpeciesId;
    name: string;
    x: number;
    y: number;
    facing: Facing;
    anim: string;
    state: SimState;
    hp01: number;
    selected?: boolean;
    targetPos?: Vec2; // V1.2 Debug: For showing target lines
};

// Simulation Events
export type SimEvent =
    | { type: 'DEATH'; tick: number; entityId: EntityId; reason: string; killedBy?: EntityId; importance?: EventImportance; tags?: string[]; location?: Vec2; subjectName?: string; targetName?: string }
    | { type: 'BIRTH'; tick: number; entityId: EntityId; parentId: EntityId; importance?: EventImportance; tags?: string[]; location?: Vec2; subjectName?: string; targetName?: string } // V2
    | { type: 'HUNT'; tick: number; predatorId: EntityId; preyId: EntityId; importance?: EventImportance; tags?: string[]; location?: Vec2; subjectName?: string; targetName?: string }
    | { type: 'DRINK'; tick: number; entityId: EntityId; waterId: ObjectId; importance?: EventImportance; tags?: string[]; location?: Vec2; subjectName?: string; targetName?: string }
    | { type: 'EAT'; tick: number; entityId: EntityId; source: 'prey' | 'trash'; importance?: EventImportance; tags?: string[]; location?: Vec2; subjectName?: string; targetName?: string }
    | { type: 'BARK'; tick: number; entityId: EntityId; importance?: EventImportance; tags?: string[]; location?: Vec2; subjectName?: string; targetName?: string }
    | { type: 'CHALLENGE_WIN'; tick: number; entityId: 'SYSTEM'; importance: 'S'; tags?: string[]; location?: Vec2; subjectName?: string; data?: any; targetName?: string }
    | { type: 'CHALLENGE_FAIL'; tick: number; entityId: 'SYSTEM'; importance: 'S'; tags?: string[]; location?: Vec2; subjectName?: string; data?: any; targetName?: string }
    | { type: 'GENERIC'; tick: number; message: string; importance: EventImportance; tags?: string[]; location?: Vec2; subjectName?: string; targetName?: string }; // For system events

// Simulation Stats
export type SimStats = {
    timeOfDay: number; // 0..1 (0=dawn, 0.25=noon, 0.75=midnight)
    rat: number;
    cat: number;
    chicken: number;
    smallBird: number;
    raccoon: number;
    crow: number;
    dog: number;
    fox: number;
    hawk: number;
    wolf: number;
    snake: number;
    deathsLastMin: number;
    birthsLastMin: number;
    warning?: boolean;     // V1.1 SOS
    currentSeed?: number;  // V1.2

    // V1.1 God Mode State (Synced from Worker or calculated)
    // Actually God Power is likely Main Thread state, but EcoStress is Simulation state.
    ecoStress?: number;

};

// Worker -> Main
export type WorkerUpdate =
    | { type: 'SNAPSHOT'; payload: { tick: number; entities: SnapshotEntity[]; objects: WorldObject[]; stats: SimStats; events: SimEvent[] } }
    | { type: 'ENTITY_DETAIL'; payload: { entity: EntityRuntime } }
    | { type: 'SPAWN_FAILED'; payload: { reason: string; species: SpeciesId } }
    | { type: 'SAVE_READY'; payload: { save: WorldSaveData } }
    | { type: 'ERROR'; payload: { message: string } };

// ============================================
// V1.1 God Mode Types
// ============================================

export type EventImportance = 'S' | 'A' | 'B' | 'C';

export interface GodPower {
    current: number;
    max: number;
    regenPerTick: number; // e.g. 0.05 per tick (~20 ticks = 1 sec)
}

export interface EcoStress {
    level: number; // 0-100
    status: 'stable' | 'stressed' | 'critical';
}

export interface Achievement {
    id: string;
    title: string;
    desc: string;
    icon: string;
    unlocked: boolean;
    progress: number;
    maxProgress: number;
}

export interface ChallengeDef {
    id: string;
    title: string;
    description: string;
    durationSec: number;
    initialSetup: {
        rats: number;
        cats: number;
        resources: ObjectType[];
    };
    winCondition: (stats: SimStats, deadCount: number) => boolean;
    failCondition?: (stats: SimStats, gpUsed: number) => boolean;
}

// ============================================
// 默认世界规则
// ============================================

export const DEFAULT_WORLD_RULES: WorldRule = {
    timeScale: 1,
    capsEnabled: true,
    capPerChunk: { rat: 20, cat: 6, chicken: 10, smallBird: 15, raccoon: 5, crow: 10, dog: 2, fox: 3, hawk: 2, wolf: 4, snake: 5 },
    trashSpawnsRats: true,
    ratSpawn: {
        enabled: true,
        perTrashEveryTicks: 120,
        probability: 0.35,
        minRatsNearbyToStop: 8,
        maxRatsNearby: 12,
    },
    deathEnabled: true,
    ai: {
        perceptionEnabled: true,
        useCoverForRats: true,
        chaseTimeoutTicks: 150,
    },
    debug: {
        showSenseRadius: false,
        showTargets: false,
        showPaths: false,
        showChunkBounds: false,
    },
};
