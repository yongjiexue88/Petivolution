// ============================================
// V1 Complete Type Definitions
// ============================================

// ============================================
// Basic Types
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
export type Sex = 'male' | 'female';

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

export type Goal = 'drink' | 'eat' | 'hunt' | 'rest' | 'flee' | 'wander' | 'forage' | 'rummage' | 'bark' | 'patrol' | 'reproduce';

// ============================================
// Vitals
// ============================================

export type Vitals = {
    hunger01: number;  // 0..1 (1=Full, 0=Starving)
    thirst01: number;  // 0..1
    fatigue01: number; // 0..1 (1=Energized, 0=Exhausted)
    health01: number;  // 0..1
};

// ============================================
// Stimulus
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
// Entity AI State (Explainability)
// ============================================

export type EntityAI = {
    lastPerceptionTick: number;
    lastDecisionTick: number;

    // Last decision result (UI Display)
    currentGoal: Goal;

    // Last utility scores (UI Display)
    lastUtilityScores: Partial<Record<Goal, number>>;

    // Recent stimuli (UI Display, limited length)
    recentStimuli: Stimulus[];

    // Last fail reason (Debug & UI)
    lastFailReason?: string;

    // Decision context (UI Display "Why")
    decisionContext?: {
        goal: string;
        targetId?: string; // Chase/Interact Target
        threatId?: string; // Flee Source
        distance?: number; // Dist to Target/Threat
        reason?: string;   // Description (Optional)
    };
};

// ============================================
//Entity
// ============================================

export type EntityRuntime = {
    id: EntityId;
    species: SpeciesId;
    name: string;
    sex: Sex;
    personality: Personality;

    pos: Vec2;         // Tile Coords
    vel: Vec2;         // tile/tick
    facing: Facing;

    vitals: Vitals;
    ageTicks: number;

    state: SimState;

    // Target (Current Action Object)
    targetEntityId?: EntityId;
    targetObjectId?: ObjectId;
    targetPos?: Vec2;

    // AI Explainability (UI shows "Why")
    ai: EntityAI;

    // V2 Family
    parents: EntityId[];
    children: EntityId[];
    generation: number;
    lastReproductionTick?: number; // V2

    // V1.1 History & Path
    history: SimEvent[];
    path: Vec2[];

    // Combat
    combat?: {
        attackCooldownTicks: number;
    };

    // Chase Tracking
    chaseTicks?: number;
    chaseStartPos?: Vec2;

    // Death Record
    dead?: {
        atTick: number;
        reason: 'starvation' | 'dehydration' | 'killed' | 'unknown';
        killedBy?: EntityId;
    };

    // P0: Spawn metadata for migration feel
    spawnReason?: 'migration' | 'reproduction' | 'ring_fallback' | 'near_resource' | 'initial';
    spawnDirection?: Vec2; // Initial velocity toward a target
};

// ============================================
// WorldObject (Placeable)
// ============================================

export type WorldObject = {
    id: ObjectId;
    type: ObjectType;
    pos: TilePos;

    data?: {
        strength01?: number;   // 0..1 (Bush Shelter Strength)
        regenRate?: number;    // Regen per tick
        resources?: number;    // Current Resources
        maxResources?: number; // Max Resources
        indestructible?: boolean; // V4: Resource Anchor
    };
};

// ============================================
// WorldRule
// ============================================

export type WorldRule = {
    // Time Scale
    timeScale: TimeScale;

    // Ecosystem Stabilizer
    capsEnabled: boolean;
    capPerChunk: Record<SpeciesId, number>;

    // Spawning/Resources
    trashSpawnsRats: boolean;
    ratSpawn: {
        enabled: boolean;
        perTrashEveryTicks: number;
        probability: number;
        minRatsNearbyToStop: number;
        maxRatsNearby: number;
    };

    // Death & Difficulty
    deathEnabled: boolean;

    // AI Intensity Toggles
    ai: {
        perceptionEnabled: boolean;
        useCoverForRats: boolean;
        chaseTimeoutTicks: number;
    };

    // Debug Toggles (UI)
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
// Save (Format)
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
    ratCount: number;
    catCount: number;
    resourceLevel: number; // 0..1 generic resource index
    dangerLevel: number;   // 0..1 generic danger index
    lastTick: number;      // Last time this chunk was updated
    counts?: Partial<Record<SpeciesId, number>>; // V3: Pop counts for virtualization
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
// Worker Communication Protocol
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

// Snapshot Entity (Only render fields)
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
    // V1.4: Add live vitals/AI for detail panel
    vitals?: Vitals;
    ageTicks?: number;
    ai?: EntityAI;
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
    wolf: number;
    hawk: number;
    snake: number;
    deathsLastMin: number;
    birthsLastMin: number;
    warning?: boolean;     // V1.1 SOS
    currentSeed?: number;  // V1.2

    // V1.1 God Mode State (Synced from Worker or calculated)
    // Actually God Power is likely Main Thread state, but EcoStress is Simulation state.
    ecoStress?: number;
    ecoStressDetails?: EcoStressDetails; // V1.4

};

// V1.4 Eco Stress Details
export type EcoStressDetails = {
    speciesStatus: {
        id: SpeciesId;
        count: number;
        min: number;
        max: number;
        stress: number; // Contribution to total stress
        status: 'critical_low' | 'low' | 'ok' | 'high' | 'critical_high';
    }[];
    diversityScore: number; // 0-100
    diversityPenalty: number;
    populationStress: number; // 0-100
};

// Worker -> Main
export type WorkerUpdate =
    | { type: 'SNAPSHOT'; payload: { tick: number; entities: SnapshotEntity[]; objects: WorldObject[]; stats: SimStats; events: SimEvent[]; graveyard?: GraveyardEntry[] } }
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
// Default World Rules
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
