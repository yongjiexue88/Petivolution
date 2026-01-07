// ============================================
// V1 模拟核心 - Tick 循环
// ============================================

import type {
    EntityRuntime,
    WorldObject,
    WorldRule,
    SnapshotEntity,
    SimStats,
    SimEvent,
    Vec2,
    SpeciesId,
    Personality,
    TilePos,
    SimState,
    Goal,
    GraveyardEntry, // Added import
} from '@shared/types';
import { V1 } from '@shared/constants';
import { DEFAULT_WORLD_RULES } from '@shared/types';
import { SPECIES_CONFIGS, clamp01 } from '@shared/species.config';
import { perceive, type PerceptionResult } from '../ai/perception';
import { calculateUtility, selectGoal } from '../ai/utility';
import { executeAction } from '../ai/actions';
import { v4 as uuid } from 'uuid';

// V1.1 Helper to record event globally and locally
export function recordEvent(sim: SimulationState, entity: EntityRuntime, event: SimEvent) {
    sim.pendingEvents.push(event);

    // Maintain local history (cap at 20)
    entity.history.push(event);
    if (entity.history.length > 20) {
        entity.history.shift();
    }
}

// ============================================
// 模拟状态
// ============================================

export interface SimulationState {
    tick: number;
    seed: number;
    mapId: string;

    entities: Map<string, EntityRuntime>;
    objects: Map<string, WorldObject>;
    graveyard: GraveyardEntry[];

    rules: WorldRule;

    // LOD
    cameraCenter: Vec2;
    cameraZoom: number;

    // RNG
    rng: () => number;

    // 事件缓冲
    pendingEvents: SimEvent[];

    // 统计
    stats: {
        birthsThisMinute: number;
        deathsThisMinute: number;
        lastMinuteTick: number;
        warning?: boolean; // V1.1
    };

    // 选中实体 (用于发送详情)
    selectedEntityId?: string;
}

// ============================================
// 创建模拟
// ============================================

export function createSimulation(
    seed: number,
    mapId: string = 'garden_v1',
    rules: WorldRule = DEFAULT_WORLD_RULES
): SimulationState {
    return {
        tick: 0,
        seed,
        mapId,
        entities: new Map(),
        objects: new Map(),
        graveyard: [],
        rules,
        cameraCenter: { x: V1.defaultMapWidth * V1.tileSizePx / 2, y: V1.defaultMapHeight * V1.tileSizePx / 2 },
        cameraZoom: 1,
        rng: createSeededRandom(seed),
        pendingEvents: [],
        stats: {
            birthsThisMinute: 0,
            deathsThisMinute: 0,
            lastMinuteTick: 0,
        },
        selectedEntityId: undefined,
    };
}

function createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

// ============================================
// 主循环
// ============================================

export function simulateTick(sim: SimulationState): void {
    if (sim.rules.timeScale === 0) return;

    const ticksToRun = sim.rules.timeScale;

    for (let i = 0; i < ticksToRun; i++) {
        sim.tick++;

        // 重置分钟统计
        if (sim.tick - sim.stats.lastMinuteTick >= V1.simTickHz * 60) {
            sim.stats.birthsThisMinute = 0;
            sim.stats.deathsThisMinute = 0;
            sim.stats.lastMinuteTick = sim.tick;
        }

        const deadEntities: string[] = [];

        for (const [id, entity] of sim.entities) {
            if (entity.state === 'dead') continue;

            const isNearCamera = isInLODRange(entity.pos, sim);
            // const config = SPECIES_CONFIGS[entity.species];

            // ========================================
            // 1. 每tick: 更新 vitals
            // ========================================
            updateVitals(entity, sim);

            // ========================================
            // 2. 检查死亡
            // ========================================
            if (entity.vitals.health01 <= 0) {
                handleDeath(entity, sim);
                deadEntities.push(id);
                continue;
            }

            // ========================================
            // 3. LOD: 远离摄像机简化处理
            // ========================================
            if (!isNearCamera) {
                simplifiedUpdate(entity, sim);
                entity.ageTicks++;
                continue;
            }

            // ========================================
            // 4. 感知 (每 N tick)
            // ========================================
            if (sim.tick % V1.perceptionEveryNTicks === 0 && sim.rules.ai.perceptionEnabled) {
                const perception = perceive(entity, sim);
                updateStimuli(entity, perception);
                entity.ai.lastPerceptionTick = sim.tick;
            }

            // ========================================
            // 5. 决策 (每 N tick)
            // ========================================
            if (sim.tick % V1.decisionEveryNTicks === 0) {
                const scores = calculateUtility(entity, sim);
                entity.ai.lastUtilityScores = scores;

                const newGoal = selectGoal(scores);
                if (newGoal !== entity.ai.currentGoal) {
                    entity.ai.currentGoal = newGoal;
                    transitionToGoal(entity, newGoal, sim);
                }

                entity.ai.lastDecisionTick = sim.tick;
            }

            // ========================================
            // 6. 追逐超时检查
            // ========================================
            if (entity.state === 'chase') {
                checkChaseTimeout(entity, sim);
            }

            // ========================================
            // 7. 每tick: 执行动作
            // ========================================
            executeAction(entity, sim);

            entity.ageTicks++;

            // Record Path (Every 60 ticks = 1s)
            if (sim.tick % 60 === 0) {
                entity.path.push({ x: entity.pos.x, y: entity.pos.y });
                // Keep last 10 points (10 seconds)
                if (entity.path.length > 10) {
                    entity.path.shift();
                }
            }

            // ========================================
            // 8. V2 Check Reproduction (Every 60 ticks)
            // ========================================
            if (sim.tick % 60 === 0) {
                checkReproduction(entity, sim);
            }
        }

        // 移除死亡实体
        for (const id of deadEntities) {
            sim.entities.delete(id);
        }

        // 资源再生 (每10 tick)
        if (sim.tick % 10 === 0) {
            for (const obj of sim.objects.values()) {
                if (obj.data?.resources !== undefined && obj.data?.maxResources !== undefined) {
                    obj.data.resources = Math.min(
                        obj.data.maxResources,
                        obj.data.resources + (obj.data.regenRate ?? 0) * 10
                    );
                }
            }
        }
    }
}

// ============================================
// Vitals 更新
// ============================================

function updateVitals(entity: EntityRuntime, _sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const v = entity.vitals;

    // 消耗
    v.hunger01 = clamp01(v.hunger01 - config.vitals.hungerDecayPerTick);
    v.thirst01 = clamp01(v.thirst01 - config.vitals.thirstDecayPerTick);

    // 疲劳 (睡觉时恢复)
    if (entity.state === 'sleep') {
        v.fatigue01 = clamp01(v.fatigue01 + config.vitals.sleepGainPerTick);
    } else {
        v.fatigue01 = clamp01(v.fatigue01 - config.vitals.fatigueDecayPerTick);
    }

    // 健康恢复 (如果状态良好)
    if (v.hunger01 > 0.3 && v.thirst01 > 0.3) {
        v.health01 = clamp01(v.health01 + 0.0002);
    }

    // 饥饿/口渴掉血
    if (v.hunger01 < config.vitals.dangerThreshold01) {
        v.health01 = clamp01(v.health01 - config.vitals.healthDamageWhenHungerBelow);
    }
    if (v.thirst01 < config.vitals.dangerThreshold01) {
        v.health01 = clamp01(v.health01 - config.vitals.healthDamageWhenThirstBelow);
    }
}

// ============================================
// 死亡处理
// ============================================

function handleDeath(entity: EntityRuntime, sim: SimulationState): void {
    let reason: 'starvation' | 'dehydration' | 'killed' | 'unknown' = 'unknown';

    if (entity.vitals.hunger01 <= 0) {
        reason = 'starvation';
    } else if (entity.vitals.thirst01 <= 0) {
        reason = 'dehydration';
    } else if (entity.dead?.reason === 'killed') {
        reason = 'killed';
    }

    entity.state = 'dead';
    entity.dead = {
        atTick: sim.tick,
        reason,
        killedBy: entity.dead?.killedBy,
    };

    // 添加到墓碑
    sim.graveyard.push({
        entityId: entity.id,
        species: entity.species,
        name: entity.name,
        personality: entity.personality,
        bornTick: sim.tick - entity.ageTicks,
        deadTick: sim.tick,
        reason,
        killedByName: entity.dead?.killedBy
            ? sim.entities.get(entity.dead.killedBy)?.name
            : undefined,
        history: [...entity.history], // V1.1 保存生平
        path: [...entity.path],       // V1.1 保存路径
    });

    // 发送事件
    const deathEvent: SimEvent = {
        type: 'DEATH',
        tick: sim.tick,
        entityId: entity.id,
        reason,
        killedBy: entity.dead?.killedBy,
    };

    sim.pendingEvents.push(deathEvent);
    // 同时记录在个人历史
    entity.history.push(deathEvent);

    sim.stats.deathsThisMinute++;
}

// ============================================
// LOD 简化更新
// ============================================

function isInLODRange(pos: Vec2, sim: SimulationState): boolean {
    const viewWidth = 1920 / sim.cameraZoom;
    const viewHeight = 1080 / sim.cameraZoom;
    const margin = 300;

    const dx = Math.abs(pos.x - sim.cameraCenter.x);
    const dy = Math.abs(pos.y - sim.cameraCenter.y);

    return dx < viewWidth / 2 + margin && dy < viewHeight / 2 + margin;
}

function simplifiedUpdate(entity: EntityRuntime, sim: SimulationState): void {
    if (entity.state !== 'sleep') {
        entity.state = 'wander';
        entity.ai.currentGoal = 'wander';
    }

    const config = SPECIES_CONFIGS[entity.species];
    const speed = config.move.speedTilesPerTick * V1.tileSizePx * 0.5;

    entity.pos.x += (sim.rng() - 0.5) * speed * 2;
    entity.pos.y += (sim.rng() - 0.5) * speed * 2;

    // 边界约束
    const maxX = V1.defaultMapWidth * V1.tileSizePx - 20;
    const maxY = V1.defaultMapHeight * V1.tileSizePx - 20;
    entity.pos.x = Math.max(20, Math.min(maxX, entity.pos.x));
    entity.pos.y = Math.max(20, Math.min(maxY, entity.pos.y));
}

// ============================================
// 追逐超时
// ============================================

function checkChaseTimeout(entity: EntityRuntime, sim: SimulationState): void {
    if (!entity.chaseTicks) {
        entity.chaseTicks = 0;
        entity.chaseStartPos = { ...entity.pos };
    }

    entity.chaseTicks++;

    if (entity.chaseTicks > sim.rules.ai.chaseTimeoutTicks) {
        entity.state = 'wander';
        entity.ai.currentGoal = 'wander';
        entity.ai.lastFailReason = 'chase_timeout';
        entity.targetEntityId = undefined;
        entity.chaseTicks = undefined;
        entity.chaseStartPos = undefined;
    }
}

// ============================================
// V2 Reproduction
// ============================================

function checkReproduction(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    if (!config.reproduction?.enabled) return;

    const rep = config.reproduction;

    // 1. Check Age
    if (entity.ageTicks < rep.minAgeTicks) return;

    // 2. Check Cooldown
    if (entity.lastReproductionTick && (sim.tick - entity.lastReproductionTick) < rep.cooldownTicks) return;

    // 3. Check Hunger
    if (entity.vitals.hunger01 < rep.minHunger) return;

    // 4. Check Chance (prob per second)
    if (sim.rng() > rep.probabilityPerSecond) return;

    // 5. Check Global Cap (Quick check)
    // Detailed check is in spawnEntity, but we can quick fail here
    if (!canSpawn(entity.species, sim)) return;

    // Apply Cost
    entity.vitals.hunger01 = Math.max(0, entity.vitals.hunger01 - rep.energyCost);
    entity.lastReproductionTick = sim.tick;

    spawnOffspring(entity, sim);
}

function spawnOffspring(parent: EntityRuntime, sim: SimulationState) {
    // Random position near parent
    const offset = (sim.rng() - 0.5) * V1.tileSizePx * 2;
    const spawnPos: TilePos = {
        tx: (parent.pos.x + offset) / V1.tileSizePx,
        ty: (parent.pos.y + offset) / V1.tileSizePx
    };

    // Inherit Personality (50% parent, 50% random)
    const personalities: Personality[] = ['curious', 'cautious', 'brave'];
    const pRand = sim.rng();
    const childPersonality = pRand > 0.5 ? parent.personality : personalities[Math.floor(sim.rng() * personalities.length)];

    const child = spawnEntity(sim, parent.species, `${parent.name} Jr.`, childPersonality, spawnPos);

    if (child) {
        // Link Family
        child.parents = [parent.id];
        child.generation = parent.generation + 1;

        parent.children.push(child.id);

        // Record Event
        const birthEvent: SimEvent = {
            type: 'BIRTH',
            tick: sim.tick,
            entityId: child.id,
            parentId: parent.id
        };
        sim.pendingEvents.push(birthEvent);
        parent.history.push(birthEvent);
    }
}

// ============================================
// 刺激更新
// ============================================

function updateStimuli(entity: EntityRuntime, perception: PerceptionResult): void {
    entity.ai.recentStimuli = perception.stimuli.slice(0, 6);
}

// ============================================
// Goal 转换
// ============================================

function transitionToGoal(entity: EntityRuntime, goal: Goal, _sim: SimulationState): void {
    // 重置追逐状态
    if (goal !== 'hunt') {
        entity.chaseTicks = undefined;
        entity.chaseStartPos = undefined;
    }

    // 映射 goal -> state
    const goalToState: Record<Goal, SimState> = {
        drink: 'moveTo',
        eat: 'moveTo',
        hunt: 'chase',
        rest: 'sleep',
        flee: 'flee',
        wander: 'wander',
    };

    entity.state = goalToState[goal];
}

// ============================================
// 实体生成
// ============================================

export function spawnEntity(
    sim: SimulationState,
    species: SpeciesId,
    name: string,
    personality: Personality,
    pos: TilePos
): EntityRuntime | null {
    // 检查人口上限
    if (!canSpawn(species, sim)) {
        return null;
    }

    // const config = SPECIES_CONFIGS[species];

    const entity: EntityRuntime = {
        id: uuid(),
        species,
        name,
        personality,
        pos: { x: pos.tx * V1.tileSizePx, y: pos.ty * V1.tileSizePx },
        vel: { x: 0, y: 0 },
        facing: 's',
        vitals: {
            hunger01: 0.8 + sim.rng() * 0.2,
            thirst01: 0.8 + sim.rng() * 0.2,
            fatigue01: 0.7 + sim.rng() * 0.3,
            health01: 1.0,
        },
        ageTicks: 0,
        state: 'idle',
        ai: {
            lastPerceptionTick: 0,
            lastDecisionTick: 0,
            currentGoal: 'wander',
            lastUtilityScores: {},
            recentStimuli: [],
        },
        parents: [], // V2
        children: [], // V2
        generation: 1, // V2 Default
        history: [], // V1.1
        path: [],    // V1.1
    };

    sim.entities.set(entity.id, entity);
    sim.stats.birthsThisMinute++;

    return entity;
}

export function canSpawn(species: SpeciesId, sim: SimulationState): boolean {
    if (!sim.rules.capsEnabled) return true;

    const cap = V1.capGlobal[species];
    let count = 0;

    for (const entity of sim.entities.values()) {
        if (entity.species === species && entity.state !== 'dead') {
            count++;
        }
    }

    return count < cap;
}

// ============================================
// 快照生成
// ============================================

export function getSnapshot(sim: SimulationState): {
    tick: number;
    entities: SnapshotEntity[];
    objects: WorldObject[];
    stats: SimStats;
    events: SimEvent[];
} {
    const entities: SnapshotEntity[] = [];

    for (const entity of sim.entities.values()) {
        entities.push({
            id: entity.id,
            species: entity.species,
            name: entity.name,
            x: entity.pos.x,
            y: entity.pos.y,
            facing: entity.facing,
            anim: getAnimationName(entity),
            state: entity.state,
            hp01: entity.vitals.health01,
            selected: entity.id === sim.selectedEntityId,
        });
    }

    let ratCount = 0;
    let catCount = 0;
    for (const e of sim.entities.values()) {
        if (e.species === 'rat') ratCount++;
        else if (e.species === 'cat') catCount++;
    }

    const events = sim.pendingEvents.splice(0);

    // V1.1 Calculate Warning
    let criticalCount = 0;
    const totalCount = sim.entities.size;
    if (totalCount > 0) {
        for (const e of sim.entities.values()) {
            if (e.vitals.hunger01 < 0.2 || e.vitals.thirst01 < 0.2) {
                criticalCount++;
            }
        }
        sim.stats.warning = (criticalCount / totalCount) > 0.5;
    } else {
        sim.stats.warning = false;
    }

    return {
        tick: sim.tick,
        entities,
        objects: Array.from(sim.objects.values()),
        stats: {
            rat: ratCount,
            cat: catCount,
            deathsLastMin: sim.stats.deathsThisMinute,
            birthsLastMin: sim.stats.birthsThisMinute,
            warning: sim.stats.warning,
            currentSeed: sim.seed // V1.2
        },
        events,
    };
}

function getAnimationName(entity: EntityRuntime): string {
    return `${entity.species}_${entity.state}`;
}

// ============================================
// 获取选中实体详情
// ============================================

export function getSelectedEntityDetail(sim: SimulationState): EntityRuntime | null {
    if (!sim.selectedEntityId) return null;
    return sim.entities.get(sim.selectedEntityId) ?? null;
}
