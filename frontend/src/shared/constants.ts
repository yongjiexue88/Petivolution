// ============================================
// V1 全局常量与配置 - Fishbowl Sandbox
// ============================================

export const V1 = {
    schemaVersion: 1,

    // 时间
    simTickHz: 15,              // 固定步长模拟 (10~20都行，推荐15)
    snapshotHz: 5,              // worker -> main 快照频率 (5Hz / 200ms)
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

    // 世界尺寸 (512×512 tiles = 8192×8192 px)
    defaultMapWidth: 512,
    defaultMapHeight: 512,
    chunkSize: 32,              // 32×32 tiles per chunk = 16×16 chunks total

    // 活跃区 (摄像机中心为圆心的"戏剧区")
    activeZoneRadiusTiles: 50,  // 玩家主要观察的区域

    // 生态密度目标 (活跃区内)
    densityTargets: {
        rat: { min: 25, max: 55 },
        cat: { min: 2, max: 5 },
        chicken: { min: 5, max: 15 },
        smallBird: { min: 10, max: 20 },
        raccoon: { min: 2, max: 5 },
        crow: { min: 5, max: 10 },
        dog: { min: 1, max: 2 },
        fox: { min: 2, max: 4 },
        hawk: { min: 1, max: 2 },
        wolf: { min: 2, max: 5 },
        snake: { min: 3, max: 6 },
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

    // 默认初始生成
    defaultSpawns: {
        rat: 1,
        cat: 1,
        chicken: 1,
        smallBird: 1,
        raccoon: 1,
        crow: 1,
        dog: 1,
        fox: 1,
        hawk: 1,
        wolf: 1,
        snake: 1,
        water: 1,
        trash: 1,
        bush: 12,
        perch: 5,
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
