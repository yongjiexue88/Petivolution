// ============================================
// V1 AI - 动作执行系统
// ============================================

import type {
    EntityRuntime,
    Vec2,
    SimEvent,
} from '@shared/types';
import type { SimulationState } from '../core/tick';
import { SPECIES_CONFIGS, OBJECT_CONFIGS, clamp01 } from '@shared/species.config';
import { V1 } from '@shared/constants';
import { distance, normalize } from './perception';

// Helper to get logic specific movement speed
function getMoveSpeed(entity: EntityRuntime, baseSpeed: number, sim: SimulationState): number {
    const config = SPECIES_CONFIGS[entity.species];
    const style = config.move.moveStyle || 'run';

    if (style === 'hop') {
        // Hop logic: move fast then stop
        // Use tick count to toggle
        const cycle = 20; // 20 ticks hop cycle
        const phase = (sim.tick + entity.id.charCodeAt(0)) % cycle; // offset by id
        if (phase < 5) {
            // Hop! (Fast burst)
            return baseSpeed * 3;
        } else {
            // Stop
            return 0;
        }
    }

    // Normal run
    return baseSpeed;
}

// ============================================
// 动作执行
// ============================================

export function executeAction(entity: EntityRuntime, sim: SimulationState): void {
    switch (entity.state) {
        case 'wander':
            executeWander(entity, sim);
            break;
        case 'moveTo':
            executeMoveTo(entity, sim);
            break;
        case 'drink':
            executeDrink(entity, sim);
            break;
        case 'eat':
            executeEat(entity, sim);
            break;
        case 'chase':
            executeChase(entity, sim);
            break;
        case 'attack':
            executeAttack(entity, sim);
            break;
        case 'flee':
            executeFlee(entity, sim);
            break;
        case 'sleep':
            executeSleep(entity, sim);
            break;
        case 'idle':
            // 空闲状态，等待下次决策
            break;
        case 'peck':
            executePeck(entity, sim);
            break;
        case 'perch':
            executePerch(entity, sim);
            break;
        case 'rummage':
            executeRummage(entity, sim);
            break;
        // 'hop' is transient movement, handled in update loop or treated as move
    }

    // 更新朝向
    updateFacing(entity);
}

// ============================================
// Wander - 随机游荡
// ============================================

function executeWander(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const baseSpeed = config.move.speedTilesPerTick * V1.tileSizePx;
    let speed = getMoveSpeed(entity, baseSpeed, sim);

    // Flocking Logic
    if (config.flock && config.flock.enabled) {
        // Placeholder for future flocking logic
        // Requires 'friendly' perception or spatial query
    }

    // 生成或更新目标点
    if (!entity.targetPos || distance(entity.pos, entity.targetPos) < 10 || speed === 0) {
        // If stopped (hopping), maybe pick new target?
        entity.targetPos = {
            x: entity.pos.x + (sim.rng() - 0.5) * 200,
            y: entity.pos.y + (sim.rng() - 0.5) * 200,
        };
    }

    // 移向目标
    moveToward(entity, entity.targetPos, speed * (0.5 + sim.rng() * 0.3));

    // Clear context
    entity.ai.decisionContext = undefined;
}

// ============================================
// MoveTo - 移动到目标
// ============================================

function executeMoveTo(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const speed = config.move.speedTilesPerTick * V1.tileSizePx;

    // 根据当前 goal 确定目标
    const goal = entity.ai.currentGoal;

    if (goal === 'drink') {
        const waterObj = findNearestObjectOfType(entity, sim, 'water');
        if (waterObj) {
            const targetPos = {
                x: waterObj.pos.tx * V1.tileSizePx,
                y: waterObj.pos.ty * V1.tileSizePx
            };
            entity.targetObjectId = waterObj.id;

            const dist = distance(entity.pos, targetPos);
            const interactRange = OBJECT_CONFIGS.water.interactRangeTiles * V1.tileSizePx;

            if (dist < interactRange) {
                entity.state = 'drink';
            } else {
                moveToward(entity, targetPos, getMoveSpeed(entity, speed, sim));
            }
        } else {
            entity.ai.lastFailReason = 'no_water_found';
            entity.state = 'wander';
            entity.ai.currentGoal = 'wander';
        }
    } else if (goal === 'eat') {
        const trashObj = findNearestObjectOfType(entity, sim, 'trash');
        if (trashObj) {
            const targetPos = {
                x: trashObj.pos.tx * V1.tileSizePx,
                y: trashObj.pos.ty * V1.tileSizePx
            };
            entity.targetObjectId = trashObj.id;

            const dist = distance(entity.pos, targetPos);
            const interactRange = OBJECT_CONFIGS.trash.interactRangeTiles * V1.tileSizePx;

            if (dist < interactRange) {
                entity.state = 'eat';
            } else {
                moveToward(entity, targetPos, getMoveSpeed(entity, speed, sim));
            }
        } else {
            entity.ai.lastFailReason = 'no_trash_found';
            entity.state = 'wander';
            entity.ai.currentGoal = 'wander';
        }
    } else if (goal === 'rest') {
        // 找灌木休息
        const bushObj = findNearestObjectOfType(entity, sim, 'bush');
        if (bushObj) {
            const targetPos = {
                x: bushObj.pos.tx * V1.tileSizePx,
                y: bushObj.pos.ty * V1.tileSizePx
            };

            const dist = distance(entity.pos, targetPos);
            const interactRange = OBJECT_CONFIGS.bush.interactRangeTiles * V1.tileSizePx;

            if (dist < interactRange) {
                entity.state = 'sleep';
            } else {
                moveToward(entity, targetPos, speed);
            }
        } else {
            // 原地睡觉
            entity.state = 'sleep';
        }
    } else if (goal === 'forage') {
        // 觅食逻辑 (Chicken)
        // 寻找附近的灌木或空地
        const bushObj = findNearestObjectOfType(entity, sim, 'bush');
        if (bushObj) {
            const targetPos = {
                x: bushObj.pos.tx * V1.tileSizePx + (sim.rng() - 0.5) * 20, // Near bush
                y: bushObj.pos.ty * V1.tileSizePx + (sim.rng() - 0.5) * 20
            };
            entity.targetObjectId = bushObj.id;

            const dist = distance(entity.pos, targetPos);
            // Peck range is small
            if (dist < 10) {
                entity.state = 'peck';
            } else {
                moveToward(entity, targetPos, speed);
            }
        } else {
            // 没有灌木，随机游荡并尝试啄食
            entity.state = 'peck'; // Just peck where we are
        }
    } else {
        entity.state = 'wander';
    }
}

// ============================================
// Rummage - 浣熊翻垃圾
// ============================================

function executeRummage(entity: EntityRuntime, sim: SimulationState): void {
    if (!entity.targetObjectId) {
        entity.state = 'idle';
        entity.ai.lastFailReason = 'No trash to rummage';
        return;
    }

    const trash = sim.objects.get(entity.targetObjectId);
    if (!trash) {
        entity.state = 'idle'; // Trash gone
        return;
    }

    // Move to trash
    // Object pos is in tiles, entity pos is in pixels/world units?
    // Wait, entity pos is also tiles in this codebase? 
    // Checking types.ts: entity.pos: Vec2 (pixel or tile? Usually tile in V1, but let's be safe).
    // V1.tileSizePx = 16. Usually entity.pos is float tiles? Or pixels?
    // In utility.ts: distancePenalty * (dist / V1.tileSizePx) implies dist is pixels.
    // In tick.ts: cameraCenter is pixels.
    // Let's assume WorldObject.pos is TilePos (integers). We need to convert to pixels for distance check.

    const trashPx = { x: trash.pos.tx * V1.tileSizePx + V1.tileSizePx / 2, y: trash.pos.ty * V1.tileSizePx + V1.tileSizePx / 2 };

    // Move to trash
    const dist = distance(entity.pos, trashPx);
    const config = SPECIES_CONFIGS[entity.species];

    // Raccoon rummage range
    if (dist > 10) { // Close enough
        // Move closer
        const speed = config.move.speedTilesPerTick * V1.tileSizePx;
        const dir = normalize({ x: trashPx.x - entity.pos.x, y: trashPx.y - entity.pos.y });
        entity.pos.x += dir.x * speed;
        entity.pos.y += dir.y * speed;
        return;
    }

    // At trash, rummage!
    // Restore hunger
    const eatRate = 0.05; // Fast eat
    entity.vitals.hunger01 = Math.min(1, entity.vitals.hunger01 + eatRate);

    // Event
    if (sim.tick % 60 === 0) {
        sim.pendingEvents.push({
            type: 'EAT',
            tick: sim.tick,
            entityId: entity.id,
            source: 'trash',
            importance: 'B',
            subjectName: entity.name,
            location: { x: entity.pos.x, y: entity.pos.y },
            tags: ['rummage', entity.species]
        });
    }

    if (entity.vitals.hunger01 >= 0.95) {
        entity.state = 'idle'; // Full
    }
}

// ============================================
// Drink - 喝水
// ============================================

function executeDrink(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];

    // 增加 thirst
    entity.vitals.thirst01 = clamp01(entity.vitals.thirst01 + config.vitals.drinkGainPerTick);

    // 记录事件
    // 记录事件
    if (entity.targetObjectId) {
        const event: SimEvent = {
            type: 'DRINK',
            tick: sim.tick,
            entityId: entity.id,
            waterId: entity.targetObjectId,
            importance: 'C',
            tags: ['drink'],
            location: { x: entity.pos.x, y: entity.pos.y },
            subjectName: entity.name,
        };
        sim.pendingEvents.push(event);
        entity.history.push(event);
        if (entity.history.length > 20) entity.history.shift();

        // 喝饱了就停止
        if (entity.vitals.thirst01 >= 0.95) {
            entity.state = 'idle';
            entity.ai.currentGoal = 'wander';
            entity.targetObjectId = undefined;
        }
    }
}

// ============================================
// Eat - 吃东西
// ============================================

function executeEat(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];

    // 增加 hunger
    entity.vitals.hunger01 = clamp01(entity.vitals.hunger01 + config.vitals.eatGainPerTick);

    // 记录事件
    // 记录事件
    const event: SimEvent = {
        type: 'EAT',
        tick: sim.tick,
        entityId: entity.id,
        source: 'trash',
        importance: 'C',
        tags: ['eat', 'trash'],
        location: { x: entity.pos.x, y: entity.pos.y },
        subjectName: entity.name,
    };
    sim.pendingEvents.push(event);
    entity.history.push(event);
    if (entity.history.length > 20) entity.history.shift();

    // 吃饱了就停止
    if (entity.vitals.hunger01 >= 0.95) {
        entity.state = 'idle';
        entity.ai.currentGoal = 'wander';
        entity.targetObjectId = undefined;
    }
}

// ============================================
// Chase - 追逐 (猫用)
// ============================================

function executeChase(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const speed = config.move.speedTilesPerTick * V1.tileSizePx * 1.2; // 追逐时加速

    // 找到猎物
    let prey: EntityRuntime | null = null;
    if (entity.targetEntityId) {
        prey = sim.entities.get(entity.targetEntityId) ?? null;
    }

    // 如果没有目标或目标死亡，找新猎物
    if (!prey || prey.state === 'dead') {
        prey = findNearestPrey(entity, sim);
        if (prey) {
            entity.targetEntityId = prey.id;
        } else {
            entity.ai.lastFailReason = 'prey_lost';
            entity.state = 'wander';
            entity.ai.currentGoal = 'wander';
            return;
        }
    }

    const dist = distance(entity.pos, prey.pos);
    const attackRange = config.combat?.attackRangeTiles ?? 1;
    const attackRangePx = attackRange * V1.tileSizePx;

    // 到达攻击范围
    if (dist < attackRangePx) {
        entity.state = 'attack';

        // 记录追捕事件
        // 记录追捕事件
        const event: SimEvent = {
            type: 'HUNT',
            tick: sim.tick,
            predatorId: entity.id,
            preyId: prey.id,
            importance: 'B',
            tags: ['hunt', 'predator'],
            location: { x: entity.pos.x, y: entity.pos.y },
            subjectName: entity.name,
            targetName: prey.name,
        };
        sim.pendingEvents.push(event);
        entity.history.push(event);
        if (entity.history.length > 20) entity.history.shift();

        // Update context
        entity.ai.decisionContext = {
            goal: 'hunt',
            targetId: prey.id,
            distance: dist / V1.tileSizePx
        };
    } else {
        moveToward(entity, prey.pos, speed);
        // Update context
        entity.ai.decisionContext = {
            goal: 'chase',
            targetId: prey.id,
            distance: dist / V1.tileSizePx
        };
    }
}

// ============================================
// Attack - 攻击 (猫用)
// ============================================

function executeAttack(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];

    if (!entity.targetEntityId) {
        entity.state = 'wander';
        return;
    }

    const prey = sim.entities.get(entity.targetEntityId);
    if (!prey || prey.state === 'dead') {
        entity.state = 'wander';
        entity.targetEntityId = undefined;
        return;
    }

    // 冷却检查
    if (!entity.combat) {
        entity.combat = { attackCooldownTicks: 0 };
    }

    if (entity.combat.attackCooldownTicks > 0) {
        entity.combat.attackCooldownTicks--;
        return;
    }

    // 执行攻击
    const killOnHit = config.combat?.killOnHit ?? false;

    if (killOnHit) {
        // 直接击杀
        prey.vitals.health01 = 0;
        prey.dead = {
            atTick: sim.tick,
            reason: 'killed',
            killedBy: entity.id,
        };
    } else {
        // 造成伤害
        const damage = config.combat?.damagePerHit ?? 0.3;
        prey.vitals.health01 = clamp01(prey.vitals.health01 - damage);
    }

    // 吃掉猎物恢复饥饿
    entity.vitals.hunger01 = clamp01(entity.vitals.hunger01 + config.vitals.eatGainPerTick * 10);

    // 记录事件
    sim.pendingEvents.push({
        type: 'EAT',
        tick: sim.tick,
        entityId: entity.id,
        source: 'prey',
        importance: 'A',
        tags: ['eat', 'prey', 'attack'],
        location: { x: entity.pos.x, y: entity.pos.y },
        subjectName: entity.name,
        targetName: prey.name,
    });

    // 重置冷却
    entity.combat.attackCooldownTicks = config.combat?.attackCooldownTicks ?? 10;

    // 返回游荡
    entity.state = 'wander';
    entity.ai.currentGoal = 'wander';
    entity.targetEntityId = undefined;
    entity.chaseTicks = undefined;
    entity.chaseStartPos = undefined;
}

// ============================================
// Flee - 逃跑 (鼠用)
// ============================================

function executeFlee(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const speed = config.move.speedTilesPerTick * V1.tileSizePx * 1.3; // 逃跑时加速

    // 找到威胁
    const threat = findNearestPredator(entity, sim);

    if (!threat) {
        // 没有威胁了，停止逃跑
        entity.state = 'wander';
        entity.ai.currentGoal = 'wander';
        return;
    }

    // 优先逃向灌木
    const bush = findNearestObjectOfType(entity, sim, 'bush');

    if (bush && sim.rules.ai.useCoverForRats) {
        const bushPos = {
            x: bush.pos.tx * V1.tileSizePx,
            y: bush.pos.ty * V1.tileSizePx
        };
        const distToBush = distance(entity.pos, bushPos);
        const interactRange = OBJECT_CONFIGS.bush.interactRangeTiles * V1.tileSizePx;

        if (distToBush < interactRange) {
            // 到达灌木，隐藏
            entity.state = 'idle';
            entity.ai.currentGoal = 'wander';
            return;
        }

        moveToward(entity, bushPos, speed);
    } else {
        // 没有灌木，远离威胁方向逃跑
        const threatPos = threat.pos;
        const dir = normalize({
            x: entity.pos.x - threatPos.x,
            y: entity.pos.y - threatPos.y,
        });

        const targetPos = {
            x: entity.pos.x + dir.x * 100,
            y: entity.pos.y + dir.y * 100,
        };

        // No hard boundary for infinite world fleeing

        moveToward(entity, targetPos, speed);

        // Update context
        entity.ai.decisionContext = {
            goal: 'flee',
            threatId: threat.id,
            distance: distance(entity.pos, threat.pos) / V1.tileSizePx,
            reason: 'predator_nearby'
        };
    }
}

// ============================================
// Sleep - 睡觉
// ============================================

function executeSleep(entity: EntityRuntime, _sim: SimulationState): void {
    // 疲劳恢复在 updateVitals 中处理

    // 恢复精力后醒来
    if (entity.vitals.fatigue01 >= 0.9) {
        entity.state = 'idle';
        entity.ai.currentGoal = 'wander';
    }

    // 如果饿了或渴了，醒来觅食
    if (entity.vitals.hunger01 < 0.3 || entity.vitals.thirst01 < 0.3) {
        entity.state = 'idle';
        // 下次决策会重新选择目标
    }
}

// ============================================
// Peck - 啄食 (Chicken)
// ============================================

function executePeck(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];

    // 随机获得少量食物
    if (sim.rng() < 0.3) {
        entity.vitals.hunger01 = clamp01(entity.vitals.hunger01 + config.vitals.eatGainPerTick);
    }

    // 啄食也是一种休息，回复少量疲劳
    entity.vitals.fatigue01 = clamp01(entity.vitals.fatigue01 + 0.001);

    // 持续一段时间后结束
    if (sim.rng() < 0.05 || entity.vitals.hunger01 > 0.9) {
        entity.state = 'idle';
        entity.ai.currentGoal = 'wander';
    }
}

// ============================================
// Perch - 栖息 (Bird)
// ============================================

function executePerch(entity: EntityRuntime, sim: SimulationState): void {
    // 快速恢复疲劳
    entity.vitals.fatigue01 = clamp01(entity.vitals.fatigue01 + 0.02);

    // 如果休息好了，或者饿了/渴了
    if (entity.vitals.fatigue01 >= 0.95 || (entity.vitals.hunger01 < 0.3 && sim.rng() < 0.05)) {
        entity.state = 'idle';
        entity.ai.currentGoal = 'wander';
    }
}

// ============================================
// 辅助函数
// ============================================

function moveToward(entity: EntityRuntime, target: Vec2, speed: number): void {
    const dir = normalize({
        x: target.x - entity.pos.x,
        y: target.y - entity.pos.y,
    });

    entity.vel.x = dir.x * speed;
    entity.vel.y = dir.y * speed;

    entity.pos.x += entity.vel.x;
    entity.pos.y += entity.vel.y;

    // No hard boundary for infinite world movement
}

function updateFacing(entity: EntityRuntime): void {
    const { x, y } = entity.vel;

    if (Math.abs(x) > Math.abs(y)) {
        entity.facing = x > 0 ? 'e' : 'w';
    } else if (Math.abs(y) > 0.01) {
        entity.facing = y > 0 ? 's' : 'n';
    }
}

function findNearestObjectOfType(
    entity: EntityRuntime,
    sim: SimulationState,
    type: string
): { id: string; pos: { tx: number; ty: number } } | null {
    let nearest: { id: string; pos: { tx: number; ty: number }; dist: number } | null = null;

    for (const obj of sim.objects.values()) {
        if (obj.type !== type) continue;

        const objPos = { x: obj.pos.tx * V1.tileSizePx, y: obj.pos.ty * V1.tileSizePx };
        const dist = distance(entity.pos, objPos);

        if (!nearest || dist < nearest.dist) {
            nearest = { id: obj.id, pos: obj.pos, dist };
        }
    }

    return nearest;
}

function findNearestPrey(entity: EntityRuntime, sim: SimulationState): EntityRuntime | null {
    const config = SPECIES_CONFIGS[entity.species];
    const senseRadius = config.sense.radiusTiles * V1.tileSizePx;

    let nearest: { entity: EntityRuntime; dist: number } | null = null;

    for (const other of sim.entities.values()) {
        if (other.id === entity.id || other.state === 'dead') continue;

        // 猫的猎物是鼠
        if (entity.species === 'cat' && other.species !== 'rat') continue;

        const dist = distance(entity.pos, other.pos);
        if (dist > senseRadius) continue;

        if (!nearest || dist < nearest.dist) {
            nearest = { entity: other, dist };
        }
    }

    return nearest?.entity ?? null;
}

function findNearestPredator(entity: EntityRuntime, sim: SimulationState): EntityRuntime | null {
    const config = SPECIES_CONFIGS[entity.species];
    const senseRadius = config.sense.radiusTiles * V1.tileSizePx;

    let nearest: { entity: EntityRuntime; dist: number } | null = null;

    for (const other of sim.entities.values()) {
        if (other.id === entity.id || other.state === 'dead') continue;

        // 鼠的捕食者是猫
        if (entity.species === 'rat' && other.species !== 'cat') continue;

        const dist = distance(entity.pos, other.pos);
        if (dist > senseRadius) continue;

        if (!nearest || dist < nearest.dist) {
            nearest = { entity: other, dist };
        }
    }

    return nearest?.entity ?? null;
}
