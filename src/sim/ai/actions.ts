// ============================================
// V1 AI - 动作执行系统
// ============================================

import type {
    EntityRuntime,
    Vec2,
} from '@shared/types';
import type { SimulationState } from '../core/tick';
import { SPECIES_CONFIGS, OBJECT_CONFIGS, clamp01 } from '@shared/species.config';
import { V1 } from '@shared/constants';
import { distance, normalize } from './perception';

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
    }

    // 更新朝向
    updateFacing(entity);
}

// ============================================
// Wander - 随机游荡
// ============================================

function executeWander(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const speed = config.move.speedTilesPerTick * V1.tileSizePx;

    // 生成或更新目标点
    if (!entity.targetPos || distance(entity.pos, entity.targetPos) < 10) {
        entity.targetPos = {
            x: entity.pos.x + (sim.rng() - 0.5) * 200,
            y: entity.pos.y + (sim.rng() - 0.5) * 200,
        };

        // 边界约束
        const maxX = V1.defaultMapWidth * V1.tileSizePx - 50;
        const maxY = V1.defaultMapHeight * V1.tileSizePx - 50;
        entity.targetPos.x = Math.max(50, Math.min(maxX, entity.targetPos.x));
        entity.targetPos.y = Math.max(50, Math.min(maxY, entity.targetPos.y));
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
                moveToward(entity, targetPos, speed);
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
                moveToward(entity, targetPos, speed);
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
    } else {
        entity.state = 'wander';
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
        const event: any = {
            type: 'DRINK',
            tick: sim.tick,
            entityId: entity.id,
            waterId: entity.targetObjectId,
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
    const event: any = {
        type: 'EAT',
        tick: sim.tick,
        entityId: entity.id,
        source: 'trash',
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
        const event: any = {
            type: 'HUNT',
            tick: sim.tick,
            predatorId: entity.id,
            preyId: prey.id,
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

        // 边界约束
        const maxX = V1.defaultMapWidth * V1.tileSizePx - 50;
        const maxY = V1.defaultMapHeight * V1.tileSizePx - 50;
        targetPos.x = Math.max(50, Math.min(maxX, targetPos.x));
        targetPos.y = Math.max(50, Math.min(maxY, targetPos.y));

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

    // 边界约束
    const maxX = V1.defaultMapWidth * V1.tileSizePx - 10;
    const maxY = V1.defaultMapHeight * V1.tileSizePx - 10;
    entity.pos.x = Math.max(10, Math.min(maxX, entity.pos.x));
    entity.pos.y = Math.max(10, Math.min(maxY, entity.pos.y));
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
