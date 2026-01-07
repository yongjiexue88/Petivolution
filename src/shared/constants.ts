// ============================================
// V1 全局常量与配置
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

    // 生态稳定器（全局上限）
    chunkSize: 32,
    capGlobal: {
        rat: 50,
        cat: 10,
    },
    capPerChunk: {
        rat: 20,
        cat: 6,
    },

    // 动物列表/快照限制（避免传太大）
    snapshotEntityFields: [
        'id', 'species', 'name', 'x', 'y',
        'facing', 'anim', 'state', 'hp01', 'selected'
    ] as const,

    // 默认地图
    defaultMapWidth: 200,
    defaultMapHeight: 200,
} as const;

export type TimeScale = 0 | 1 | 2 | 4;
