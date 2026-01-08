// ============================================
// V1 AI - 感知系统
// ============================================

import type {
    EntityRuntime,
    Stimulus,
    Vec2,
} from '@shared/types';
import type { SimulationState } from '../core/tick';
import { SPECIES_CONFIGS } from '@shared/species.config';
import { V1 } from '@shared/constants';

// ============================================
// 感知结果
// ============================================

export interface PerceptionResult {
    stimuli: Stimulus[];
    nearestPrey: { entityId: string; dist: number } | null;
    nearestPredator: { entityId: string; dist: number } | null;
    nearestWater: { objectId: string; dist: number } | null;
    nearestBush: { objectId: string; dist: number } | null;
    nearestTrash: { objectId: string; dist: number } | null;
}

// ============================================
// 感知
// ============================================

export function perceive(entity: EntityRuntime, sim: SimulationState): PerceptionResult {
    const config = SPECIES_CONFIGS[entity.species];
    const senseRadius = config.sense.radiusTiles * V1.tileSizePx;

    const stimuli: Stimulus[] = [];

    let nearestPrey: { entityId: string; dist: number } | null = null;
    let nearestPredator: { entityId: string; dist: number } | null = null;
    let nearestWater: { objectId: string; dist: number } | null = null;
    let nearestBush: { objectId: string; dist: number } | null = null;
    let nearestTrash: { objectId: string; dist: number } | null = null;

    // 检测其他实体
    for (const other of sim.entities.values()) {
        if (other.id === entity.id || other.state === 'dead') continue;

        const dist = distance(entity.pos, other.pos);
        if (dist > senseRadius) continue;

        // 鼠视角: 猫、狗、浣熊是捕食者
        if (entity.species === 'rat') {
            if (other.species === 'cat' || other.species === 'dog' || other.species === 'raccoon') {
                stimuli.push({ type: 'predator', entityId: other.id, dist });
                if (!nearestPredator || dist < nearestPredator.dist) nearestPredator = { entityId: other.id, dist };
            }
        }

        // 猫视角: 鼠、小鸟、鸡是猎物; 狗是捕食者
        if (entity.species === 'cat') {
            if (['rat', 'smallBird', 'chicken'].includes(other.species)) {
                stimuli.push({ type: 'prey', entityId: other.id, dist });
                if (!nearestPrey || dist < nearestPrey.dist) nearestPrey = { entityId: other.id, dist };
            }
            if (other.species === 'dog') {
                stimuli.push({ type: 'predator', entityId: other.id, dist });
                if (!nearestPredator || dist < nearestPredator.dist) nearestPredator = { entityId: other.id, dist };
            }
        }

        // 狗视角: 鼠、浣熊、狐狸(future)是猎物/威胁
        if (entity.species === 'dog') {
            if (['rat', 'raccoon', 'cat', 'wolf', 'fox'].includes(other.species)) {
                stimuli.push({ type: 'prey', entityId: other.id, dist });
                if (!nearestPrey || dist < nearestPrey.dist) nearestPrey = { entityId: other.id, dist };
            }
        }

        // 浣熊视角: 鸡、蛋(future)、垃圾是目标; 狗是威胁
        if (entity.species === 'raccoon') {
            if (['chicken', 'smallBird', 'rat'].includes(other.species)) { // Opportunistic
                stimuli.push({ type: 'prey', entityId: other.id, dist });
                if (!nearestPrey || dist < nearestPrey.dist) nearestPrey = { entityId: other.id, dist };
            }
            if (other.species === 'dog') {
                stimuli.push({ type: 'predator', entityId: other.id, dist });
                if (!nearestPredator || dist < nearestPredator.dist) nearestPredator = { entityId: other.id, dist };
            }
        }

        // 鸡/鸟视角: 猫、浣熊、狗是威胁
        if (['chicken', 'smallBird'].includes(entity.species)) {
            if (['cat', 'raccoon', 'dog', 'rat'].includes(other.species)) {
                stimuli.push({ type: 'predator', entityId: other.id, dist });
                // Small birds fear cats more, logic in utility?
                if (!nearestPredator || dist < nearestPredator.dist) nearestPredator = { entityId: other.id, dist };
            }
        }
    }

    // 检测世界对象
    for (const obj of sim.objects.values()) {
        const objPos = { x: obj.pos.tx * V1.tileSizePx, y: obj.pos.ty * V1.tileSizePx };
        const dist = distance(entity.pos, objPos);
        if (dist > senseRadius) continue;

        switch (obj.type) {
            case 'water':
                stimuli.push({ type: 'water', objectId: obj.id, dist });
                if (!nearestWater || dist < nearestWater.dist) {
                    nearestWater = { objectId: obj.id, dist };
                }
                break;

            case 'bush':
                stimuli.push({ type: 'bush', objectId: obj.id, dist });
                if (!nearestBush || dist < nearestBush.dist) {
                    nearestBush = { objectId: obj.id, dist };
                }
                break;

            case 'trash':
                stimuli.push({ type: 'trash', objectId: obj.id, dist });
                if (!nearestTrash || dist < nearestTrash.dist) {
                    nearestTrash = { objectId: obj.id, dist };
                }
                break;
        }
    }

    // 按距离排序
    stimuli.sort((a, b) => a.dist - b.dist);

    return {
        stimuli,
        nearestPrey,
        nearestPredator,
        nearestWater,
        nearestBush,
        nearestTrash,
    };
}

// ============================================
// 辅助函数
// ============================================

export function distance(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function distanceTiles(a: Vec2, b: Vec2): number {
    return distance(a, b) / V1.tileSizePx;
}

export function normalize(v: Vec2): Vec2 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}
