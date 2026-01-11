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
        const cycle = 20;
        const phase = (sim.tick + entity.id.charCodeAt(0)) % cycle;
        if (phase < 5) {
            return baseSpeed * 3;
        } else {
            return 0;
        }
    }

    return baseSpeed;
}

// ============================================
// 动作执行
// ============================================

export function executeAction(entity: EntityRuntime, sim: SimulationState): void {
    switch (entity.state) {
        case 'idle':
            // 空闲状态
            break;
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
        case 'peck':
            executePeck(entity, sim);
            break;
        case 'perch':
            executePerch(entity, sim);
            break;
        case 'rummage':
            executeRummage(entity, sim);
            break;
        case 'bark':
            executeBark(entity, sim);
            break;
        case 'patrol':
            executePatrol(entity, sim);
            break;
    }

    updateFacing(entity);
}

// ============================================
// Wander - 随机游荡 (含 Flocking)
// ============================================

function executeWander(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const baseSpeed = config.move.speedTilesPerTick * V1.tileSizePx;
    const speed = getMoveSpeed(entity, baseSpeed, sim);

    let wanderVec = { x: 0, y: 0 };

    // Flocking Logic
    if (config.flock && config.flock.enabled) {
        const friends = entity.ai.recentStimuli.filter(s => s.type === 'friend' && s.dist < config.flock!.radiusTiles * V1.tileSizePx);

        if (friends.length > 0) {
            let cohesion = { x: 0, y: 0 };
            let alignment = { x: 0, y: 0 };
            let separation = { x: 0, y: 0 };

            let friendCount = 0;
            for (const f of friends) {
                if (f.type !== 'friend') continue;
                const other = sim.entities.get(f.entityId);
                if (!other) continue;

                friendCount++;
                cohesion.x += other.pos.x;
                cohesion.y += other.pos.y;

                alignment.x += other.vel.x;
                alignment.y += other.vel.y;

                if (f.dist < 16) {
                    const diff = { x: entity.pos.x - other.pos.x, y: entity.pos.y - other.pos.y };
                    const dist = Math.max(0.1, f.dist);
                    separation.x += diff.x / dist;
                    separation.y += diff.y / dist;
                }
            }

            if (friendCount > 0) {
                cohesion.x = (cohesion.x / friendCount - entity.pos.x) * config.flock.cohesionWeight;
                cohesion.y = (cohesion.y / friendCount - entity.pos.y) * config.flock.cohesionWeight;

                alignment.x = (alignment.x / friendCount) * config.flock.alignmentWeight;
                alignment.y = (alignment.y / friendCount) * config.flock.alignmentWeight;

                separation.x *= config.flock.separationWeight * 10;
                separation.y *= config.flock.separationWeight * 10;

                wanderVec.x += cohesion.x + alignment.x + separation.x;
                wanderVec.y += cohesion.y + alignment.y + separation.y;
            }
        }
    }

    if (!entity.targetPos || distance(entity.pos, entity.targetPos) < 10 || speed === 0) {
        entity.targetPos = {
            x: entity.pos.x + (sim.rng() - 0.5) * 200,
            y: entity.pos.y + (sim.rng() - 0.5) * 200,
        };
    }

    const tDir = normalize({
        x: entity.targetPos.x - entity.pos.x,
        y: entity.targetPos.y - entity.pos.y
    });

    wanderVec.x += tDir.x * speed;
    wanderVec.y += tDir.y * speed;

    const finalDir = normalize(wanderVec);
    moveToward(entity, { x: entity.pos.x + finalDir.x * 10, y: entity.pos.y + finalDir.y * 10 }, speed * (0.5 + sim.rng() * 0.3));

    entity.ai.decisionContext = undefined;
}

// ============================================
// MoveTo - 移动到目标
// ============================================

function executeMoveTo(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const speed = config.move.speedTilesPerTick * V1.tileSizePx;
    const goal = entity.ai.currentGoal;

    if (goal === 'drink') {
        const waterObj = findNearestObjectOfType(entity, sim, 'water');
        if (waterObj) {
            const targetPos = { x: waterObj.pos.tx * V1.tileSizePx, y: waterObj.pos.ty * V1.tileSizePx };
            entity.targetObjectId = waterObj.id;
            const dist = distance(entity.pos, targetPos);
            const interactRange = OBJECT_CONFIGS.water.interactRangeTiles * V1.tileSizePx;

            if (dist < interactRange) {
                entity.state = 'drink';
            } else {
                moveToward(entity, targetPos, getMoveSpeed(entity, speed, sim));
            }
        } else {
            entity.state = 'wander';
            entity.ai.currentGoal = 'wander';
        }
    } else if (goal === 'eat') {
        const trashObj = findNearestObjectOfType(entity, sim, 'trash');
        if (trashObj) {
            const targetPos = { x: trashObj.pos.tx * V1.tileSizePx, y: trashObj.pos.ty * V1.tileSizePx };
            entity.targetObjectId = trashObj.id;
            const dist = distance(entity.pos, targetPos);
            const interactRange = OBJECT_CONFIGS.trash.interactRangeTiles * V1.tileSizePx;

            if (dist < interactRange) {
                entity.state = 'eat';
            } else {
                moveToward(entity, targetPos, getMoveSpeed(entity, speed, sim));
            }
        } else {
            entity.state = 'wander';
            entity.ai.currentGoal = 'wander';
        }
    } else if (goal === 'rest') {
        const bushObj = findNearestObjectOfType(entity, sim, 'bush');
        if (bushObj) {
            const targetPos = { x: bushObj.pos.tx * V1.tileSizePx, y: bushObj.pos.ty * V1.tileSizePx };
            const dist = distance(entity.pos, targetPos);
            const interactRange = OBJECT_CONFIGS.bush.interactRangeTiles * V1.tileSizePx;

            if (dist < interactRange) {
                entity.state = 'sleep';
            } else {
                moveToward(entity, targetPos, speed);
            }
        } else {
            entity.state = 'sleep';
        }
    } else if (goal === 'forage') {
        const bushObj = findNearestObjectOfType(entity, sim, 'bush');
        if (bushObj) {
            const targetPos = {
                x: bushObj.pos.tx * V1.tileSizePx + (sim.rng() - 0.5) * 20,
                y: bushObj.pos.ty * V1.tileSizePx + (sim.rng() - 0.5) * 20
            };
            entity.targetObjectId = bushObj.id;
            const dist = distance(entity.pos, targetPos);
            if (dist < 10) {
                entity.state = 'peck';
            } else {
                moveToward(entity, targetPos, speed);
            }
        } else {
            entity.state = 'peck';
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
        entity.state = 'idle' as any;
        return;
    }

    const trash = sim.objects.get(entity.targetObjectId);
    if (!trash) {
        entity.state = 'idle' as any;
        return;
    }

    const trashPx = { x: trash.pos.tx * V1.tileSizePx + V1.tileSizePx / 2, y: trash.pos.ty * V1.tileSizePx + V1.tileSizePx / 2 };
    const dist = distance(entity.pos, trashPx);
    const config = SPECIES_CONFIGS[entity.species];

    if (dist > 10) {
        const speed = config.move.speedTilesPerTick * V1.tileSizePx;
        moveToward(entity, trashPx, speed);
        return;
    }

    // Resource Consumption
    if (trash.data) {
        if (!trash.data.indestructible) {
            if ((trash.data.resources || 0) <= 0) {
                // Empty
                entity.state = 'idle' as any;
                return;
            }
            trash.data.resources = (trash.data.resources || 0) - 0.5; // Consume
        }
    }

    entity.vitals.hunger01 = Math.min(1, entity.vitals.hunger01 + 0.05);

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
        entity.state = 'idle' as any;
    }
}

// ============================================
// Drink - 喝水
// ============================================

function executeDrink(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];

    // Resource Consumption
    if (entity.targetObjectId) {
        const water = sim.objects.get(entity.targetObjectId);
        if (water && water.data) {
            if (!water.data.indestructible) {
                if ((water.data.resources || 0) <= 0) {
                    entity.state = 'idle' as any;
                    return;
                }
                water.data.resources = (water.data.resources || 0) - 0.2;
            }
        }
    }

    entity.vitals.thirst01 = clamp01(entity.vitals.thirst01 + config.vitals.drinkGainPerTick);

    if (entity.targetObjectId) {
        if (sim.tick % 60 === 0) {
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
        }

        if (entity.vitals.thirst01 >= 0.95) {
            entity.state = 'idle' as any;
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

    // Resource Consumption (for Trash)
    if (entity.targetObjectId) {
        const obj = sim.objects.get(entity.targetObjectId);
        if (obj && obj.type === 'trash' && obj.data) {
            if (!obj.data.indestructible) {
                if ((obj.data.resources || 0) <= 0) {
                    entity.state = 'idle' as any;
                    return;
                }
                obj.data.resources = (obj.data.resources || 0) - 0.5;
            }
        }
    }

    entity.vitals.hunger01 = clamp01(entity.vitals.hunger01 + config.vitals.eatGainPerTick);

    if (sim.tick % 60 === 0) {
        sim.pendingEvents.push({
            type: 'EAT',
            tick: sim.tick,
            entityId: entity.id,
            source: 'trash',
            importance: 'C',
            tags: ['eat', 'trash'],
            location: { x: entity.pos.x, y: entity.pos.y },
            subjectName: entity.name,
        });
    }

    if (entity.vitals.hunger01 >= 0.95) {
        entity.state = 'idle' as any;
        entity.ai.currentGoal = 'wander';
        entity.targetObjectId = undefined;
    }
}

// ============================================
// Chase - 追逐
// ============================================

function executeChase(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const speed = config.move.speedTilesPerTick * V1.tileSizePx * 1.2;

    let prey = entity.targetEntityId ? sim.entities.get(entity.targetEntityId) : null;

    if (!prey || prey.state === 'dead') {
        prey = findNearestPrey(entity, sim);
        if (prey) {
            entity.targetEntityId = prey.id;
        } else {
            entity.state = 'wander';
            entity.ai.currentGoal = 'wander';
            return;
        }
    }

    const dist = distance(entity.pos, prey.pos);
    const attackRangePx = (config.combat?.attackRangeTiles ?? 1) * V1.tileSizePx;

    if (dist < attackRangePx) {
        entity.state = 'attack';
        sim.pendingEvents.push({
            type: 'HUNT',
            tick: sim.tick,
            predatorId: entity.id,
            preyId: prey.id,
            importance: 'B',
            location: { x: entity.pos.x, y: entity.pos.y },
            subjectName: entity.name,
            targetName: prey.name,
        });
    } else {
        moveToward(entity, prey.pos, speed);
    }
}

// ============================================
// Attack - 攻击
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

    if (!entity.combat) entity.combat = { attackCooldownTicks: 0 };

    if (entity.combat.attackCooldownTicks > 0) {
        entity.combat.attackCooldownTicks--;
        return;
    }

    if (config.combat?.killOnHit) {
        prey.vitals.health01 = 0;
        prey.dead = { atTick: sim.tick, reason: 'killed', killedBy: entity.id };
    } else {
        prey.vitals.health01 = clamp01(prey.vitals.health01 - (config.combat?.damagePerHit ?? 0.3));
    }

    entity.vitals.hunger01 = clamp01(entity.vitals.hunger01 + config.vitals.eatGainPerTick * 10);

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

    entity.combat.attackCooldownTicks = config.combat?.attackCooldownTicks ?? 10;
    entity.state = 'wander';
}

// ============================================
// Flee - 逃跑
// ============================================

function executeFlee(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const speed = config.move.speedTilesPerTick * V1.tileSizePx * 1.3;

    const threat = findNearestPredator(entity, sim);
    if (!threat) {
        entity.state = 'wander';
        entity.ai.currentGoal = 'wander';
        return;
    }

    const bush = findNearestObjectOfType(entity, sim, 'bush');
    if (bush && sim.rules.ai.useCoverForRats) {
        const bushPos = { x: bush.pos.tx * V1.tileSizePx, y: bush.pos.ty * V1.tileSizePx };
        if (distance(entity.pos, bushPos) < 16) {
            entity.state = 'idle' as any;
            return;
        }
        moveToward(entity, bushPos, speed);
    } else {
        const dir = normalize({ x: entity.pos.x - threat.pos.x, y: entity.pos.y - threat.pos.y });
        moveToward(entity, { x: entity.pos.x + dir.x * 100, y: entity.pos.y + dir.y * 100 }, speed);
    }
}

// ============================================
// Sleep - 睡觉
// ============================================

function executeSleep(entity: EntityRuntime, _sim: SimulationState): void {
    if (entity.vitals.fatigue01 >= 0.9 || entity.vitals.hunger01 < 0.3 || entity.vitals.thirst01 < 0.3) {
        entity.state = 'idle' as any;
        entity.ai.currentGoal = 'wander';
    }
}

// ============================================
// Peck - 啄食
// ============================================

function executePeck(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    if (sim.rng() < 0.3) entity.vitals.hunger01 = clamp01(entity.vitals.hunger01 + config.vitals.eatGainPerTick);
    entity.vitals.fatigue01 = clamp01(entity.vitals.fatigue01 + 0.001);

    if (sim.rng() < 0.05 || entity.vitals.hunger01 > 0.9) {
        entity.state = 'idle' as any;
        entity.ai.currentGoal = 'wander';
    }
}

// ============================================
// Perch - 栖息
// ============================================

function executePerch(entity: EntityRuntime, sim: SimulationState): void {
    entity.vitals.fatigue01 = clamp01(entity.vitals.fatigue01 + 0.02);
    if (entity.vitals.fatigue01 >= 0.95 || (entity.vitals.hunger01 < 0.3 && sim.rng() < 0.05)) {
        entity.state = 'idle' as any;
        entity.ai.currentGoal = 'wander';
    }
}

// ============================================
// Bark - 吠叫 (Dog)
// ============================================

function executeBark(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const speed = config.move.speedTilesPerTick * V1.tileSizePx;

    const intruderNode = entity.ai.recentStimuli.find(s => s.type === 'intruder');
    const intruder = (intruderNode && intruderNode.type === 'intruder') ? sim.entities.get(intruderNode.entityId) : null;

    if (!intruder) {
        entity.state = 'idle' as any;
        return;
    }

    const dist = distance(entity.pos, intruder.pos);

    if (sim.tick % 60 === 0) {
        sim.pendingEvents.push({
            type: 'BARK',
            tick: sim.tick,
            entityId: entity.id,
            importance: 'B',
            location: { x: entity.pos.x, y: entity.pos.y },
            subjectName: entity.name,
            targetName: intruder.name,
            tags: ['bark', 'guardian']
        });
    }

    const barkRangePx = 3 * V1.tileSizePx;
    if (dist > barkRangePx) {
        moveToward(entity, intruder.pos, speed * 1.2);
    } else {
        entity.vel.x = 0;
        entity.vel.y = 0;
        const dir = normalize({ x: intruder.pos.x - entity.pos.x, y: intruder.pos.y - entity.pos.y });
        updateFacingFromDir(entity, dir);
    }
}

// ============================================
// Patrol - 巡逻 (Dog)
// ============================================

function executePatrol(entity: EntityRuntime, sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const speed = config.move.speedTilesPerTick * V1.tileSizePx;

    if (!entity.targetPos || distance(entity.pos, entity.targetPos) < 20) {
        const angle = sim.rng() * Math.PI * 2;
        const radius = 150 + sim.rng() * 100;
        entity.targetPos = {
            x: entity.pos.x + Math.cos(angle) * radius,
            y: entity.pos.y + Math.sin(angle) * radius
        };
    }

    moveToward(entity, entity.targetPos, speed * 0.8);
}

// ============================================
// 辅助函数
// ============================================

function moveToward(entity: EntityRuntime, target: Vec2, speed: number): void {
    const dir = normalize({ x: target.x - entity.pos.x, y: target.y - entity.pos.y });
    entity.vel.x = dir.x * speed;
    entity.vel.y = dir.y * speed;
    entity.pos.x += entity.vel.x;
    entity.pos.y += entity.vel.y;
}

function updateFacing(entity: EntityRuntime): void {
    if (Math.abs(entity.vel.x) > Math.abs(entity.vel.y)) {
        entity.facing = entity.vel.x > 0 ? 'e' : 'w';
    } else if (Math.abs(entity.vel.y) > 0.01) {
        entity.facing = entity.vel.y > 0 ? 's' : 'n';
    }
}

function updateFacingFromDir(entity: EntityRuntime, dir: Vec2): void {
    if (Math.abs(dir.x) > Math.abs(dir.y)) {
        entity.facing = dir.x > 0 ? 'e' : 'w';
    } else {
        entity.facing = dir.y > 0 ? 's' : 'n';
    }
}

function findNearestObjectOfType(entity: EntityRuntime, sim: SimulationState, type: string) {
    let nearest: { id: string, pos: { tx: number, ty: number }, dist: number } | null = null;
    for (const obj of sim.objects.values()) {
        if (obj.type !== type) continue;
        const oPx = { x: obj.pos.tx * V1.tileSizePx, y: obj.pos.ty * V1.tileSizePx };
        const dist = distance(entity.pos, oPx);
        if (!nearest || dist < nearest.dist) nearest = { id: obj.id, pos: obj.pos, dist };
    }
    return nearest;
}

function findNearestPrey(entity: EntityRuntime, sim: SimulationState): EntityRuntime | null {
    const config = SPECIES_CONFIGS[entity.species];
    const radius = config.sense.radiusTiles * V1.tileSizePx;
    let nearest: { e: EntityRuntime, d: number } | null = null;
    for (const other of sim.entities.values()) {
        if (other.id === entity.id || other.state === 'dead') continue;
        if (entity.species === 'cat' && !['rat', 'smallBird', 'chicken'].includes(other.species)) continue;
        const d = distance(entity.pos, other.pos);
        if (d > radius) continue;
        if (!nearest || d < nearest.d) nearest = { e: other, d };
    }
    return nearest?.e ?? null;
}

function findNearestPredator(entity: EntityRuntime, sim: SimulationState): EntityRuntime | null {
    const config = SPECIES_CONFIGS[entity.species];
    const radius = config.sense.radiusTiles * V1.tileSizePx;
    let nearest: { e: EntityRuntime, d: number } | null = null;
    for (const other of sim.entities.values()) {
        if (other.id === entity.id || other.state === 'dead') continue;
        if (['rat', 'chicken', 'smallBird'].includes(entity.species) && ['cat', 'dog', 'fox', 'wolf'].includes(other.species)) {
            const d = distance(entity.pos, other.pos);
            if (d > radius) continue;
            if (!nearest || d < nearest.d) nearest = { e: other, d };
        }
    }
    return nearest?.e ?? null;
}
