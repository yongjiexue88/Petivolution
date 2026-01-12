// ============================================
// V1 全局常量与配置 - Fishbowl Sandbox
// ============================================

export const V1 = {
    schemaVersion: 1,

    // 时间
    simTickHz: 15,              // 固定步长模拟 (10~20都行，推荐15)
    snapshotHz: 10,             // worker -> main 快照频率
    perceptionEveryNTicks: 5,   // 感知频率
    decisionEveryNTicks: 10,    // 决策频率

    // 视觉/单位（统一用 tile 为单位）
    tileSizePx: 16,             // 像素风常见 16/32
    worldUnits: 'tile' as const,

    // 距离与惩罚
    maxSenseRadiusTiles: 14,    // V1感知最大半径（物种可更小）
    chaseTimeoutTicks: 15 * 10, // 最多追逐 10 秒 (tick=15 -> 150 ticks)

    // ============================================
    // V1 Fishbowl World - 有限但"看起来很大"
    // ============================================

    // 世界尺寸 (256×256 tiles = 4096×4096 px)
    defaultMapWidth: 256,
    defaultMapHeight: 256,
    chunkSize: 32,              // 32×32 tiles per chunk = 8×8 chunks total

    // 活跃区 (摄像机中心为圆心的"戏剧区")
    activeZoneRadiusTiles: 50,  // 玩家主要观察的区域

    // Ecosystem density targets (balanced for ~60% stress)
    // All species have min: 2 to ensure mating pairs exist
    // Prey species have higher max than predators
    densityTargets: {
        rat: { min: 2, max: 30 },        // prey, abundant
        cat: { min: 2, max: 20 },        // predator
        chicken: { min: 2, max: 25 },    // prey
        smallBird: { min: 2, max: 25 },  // prey
        raccoon: { min: 2, max: 15 },    // omnivore
        crow: { min: 2, max: 20 },       // scavenger
        dog: { min: 2, max: 10 },        // apex predator (guardian)
        fox: { min: 2, max: 15 },        // predator
        hawk: { min: 2, max: 10 },       // apex predator
        wolf: { min: 2, max: 10 },       // apex predator
        snake: { min: 2, max: 15 },      // predator
    },

    // 每个chunk的密度上限 (防止局部过密)
    capPerChunk: {
        rat: 20,
        cat: 6,
        chicken: 10,
        smallBird: 15,
        raccoon: 5,
        crow: 10,
        dog: 2,
        fox: 4,
        hawk: 2,
        wolf: 5,
        snake: 6,
    },

    // Default initial spawns (balanced prey/predator ratio)
    // Prey species: 6-8, Predators: 3-4, Apex: 2
    defaultSpawns: {
        rat: 8,        // prey base
        cat: 4,        // predator
        chicken: 6,    // prey
        smallBird: 6,  // prey
        raccoon: 3,    // omnivore
        crow: 4,       // scavenger
        dog: 2,        // guardian (rare)
        fox: 3,        // predator
        hawk: 2,       // apex (rare)
        wolf: 2,       // apex (rare)
        snake: 3,      // predator
        water: 6,      // increased for more drinking spots
        trash: 4,      // increased for food sources
        bush: 20,      // shelter/foraging
        perch: 10,     // bird rest spots
    },

    // 生态维护器
    maintainerIntervalSec: 5,   // 每5秒检查一次生态平衡
    maintainerIntervalTicks: 15 * 5, // 75 ticks

    // 动物列表/快照限制（避免传太大）
    snapshotEntityFields: [
        'id', 'species', 'name', 'x', 'y',
        'facing', 'anim', 'state', 'hp01', 'selected'
    ] as const,

    // V1.1 God Mode
    godMode: {
        maxGP: 100,
        startGP: 60,
        regenPerSnapshot: 0.0333, // ~ 1 GP / 3s
        costs: {
            spawn: {
                rat: 2,
                cat: 8,
                chicken: 4,
                smallBird: 3,
            },
            place: {
                water: 10,
                bush: 4,
                trash: 6,
                perch: 5,
            },
            action: {
                emergencyAid: 15,
            }
        },
        cooldowns: {
            emergencyAid: 120, // seconds
        }
    },
} as const;


export type TimeScale = 0 | 1 | 2 | 4;
