// ============================================
// V1 AI - Perception System
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
// Perception Result
// ============================================

export interface PerceptionResult {
    stimuli: Stimulus[];
    nearestPrey: { entityId: string; dist: number } | null;
    nearestPredator: { entityId: string; dist: number } | null;
    nearestWater: { objectId: string; dist: number } | null;
    nearestBush: { objectId: string; dist: number } | null;
    nearestTrash: { objectId: string; dist: number } | null;
    nearestIntruder: { entityId: string; dist: number } | null;
}

// ============================================
// Perception
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
    let nearestIntruder: { entityId: string; dist: number } | null = null;

    // Detect other entities
    for (const other of sim.entities.values()) {
        if (other.id === entity.id || other.state === 'dead') continue;

        const dist = distance(entity.pos, other.pos);
        if (dist > senseRadius) continue;

        // Flocking: All species see their own kind as friends
        if (other.species === entity.species) {
            stimuli.push({ type: 'friend', entityId: other.id, dist });
        }

        // Rat perspective: Cat, Dog, Raccoon, Fox, Wolf, Snake, Hawk are predators
        if (entity.species === 'rat') {
            if (['cat', 'dog', 'raccoon', 'fox', 'wolf', 'snake', 'hawk'].includes(other.species)) {
                stimuli.push({ type: 'predator', entityId: other.id, dist });
                if (!nearestPredator || dist < nearestPredator.dist) nearestPredator = { entityId: other.id, dist };
            }
        }

        // Cat perspective: Rat, small bird, chicken are prey; Dog is predator
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

        // Dog perspective: Rat, Raccoon, Fox (future) are prey/threats
        if (entity.species === 'dog') {
            const isIntruder = ['rat', 'raccoon', 'cat', 'wolf', 'fox', 'crow', 'hawk'].includes(other.species);
            if (isIntruder) {
                stimuli.push({ type: 'intruder', entityId: other.id, dist });
                if (!nearestIntruder || dist < nearestIntruder.dist) nearestIntruder = { entityId: other.id, dist };
            }

            if (['rat', 'raccoon', 'cat', 'wolf', 'fox'].includes(other.species)) {
                stimuli.push({ type: 'prey', entityId: other.id, dist });
                if (!nearestPrey || dist < nearestPrey.dist) nearestPrey = { entityId: other.id, dist };
            }
        }

        // Raccoon perspective: Chicken, eggs (future), trash are targets; Dog is threat
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

        // Chicken/Bird perspective: Cat, Raccoon, Dog, Fox, Wolf, Hawk are threats
        if (['chicken', 'smallBird'].includes(entity.species)) {
            if (['cat', 'raccoon', 'dog', 'rat', 'wolf', 'fox', 'hawk', 'snake'].includes(other.species)) {
                stimuli.push({ type: 'predator', entityId: other.id, dist });
                if (!nearestPredator || dist < nearestPredator.dist) nearestPredator = { entityId: other.id, dist };
            }
        }

        // 🦊 Fox perspective: Rat, Chicken, Small Bird are prey; Dog, Wolf are threats
        if (entity.species === 'fox') {
            if (['rat', 'chicken', 'smallBird'].includes(other.species)) {
                stimuli.push({ type: 'prey', entityId: other.id, dist });
                if (!nearestPrey || dist < nearestPrey.dist) nearestPrey = { entityId: other.id, dist };
            }
            if (['dog', 'wolf'].includes(other.species)) {
                stimuli.push({ type: 'predator', entityId: other.id, dist });
                if (!nearestPredator || dist < nearestPredator.dist) nearestPredator = { entityId: other.id, dist };
            }
        }

        // 🦅 Hawk perspective: Rat, Small Bird, Chicken are prey (aerial dive predator)
        if (entity.species === 'hawk') {
            if (['rat', 'smallBird', 'chicken', 'snake'].includes(other.species)) {
                stimuli.push({ type: 'prey', entityId: other.id, dist });
                if (!nearestPrey || dist < nearestPrey.dist) nearestPrey = { entityId: other.id, dist };
            }
        }

        // 🐺 Wolf perspective: Rat, Chicken, Raccoon, Fox are prey (pack hunter)
        if (entity.species === 'wolf') {
            if (['rat', 'chicken', 'raccoon', 'fox', 'smallBird'].includes(other.species)) {
                stimuli.push({ type: 'prey', entityId: other.id, dist });
                if (!nearestPrey || dist < nearestPrey.dist) nearestPrey = { entityId: other.id, dist };
            }
        }

        // 🐍 Snake perspective: Rat, Small Bird are prey; Hawk is threat (ambush predator)
        if (entity.species === 'snake') {
            if (['rat', 'smallBird'].includes(other.species)) {
                stimuli.push({ type: 'prey', entityId: other.id, dist });
                if (!nearestPrey || dist < nearestPrey.dist) nearestPrey = { entityId: other.id, dist };
            }
            if (other.species === 'hawk') {
                stimuli.push({ type: 'predator', entityId: other.id, dist });
                if (!nearestPredator || dist < nearestPredator.dist) nearestPredator = { entityId: other.id, dist };
            }
        }

        // 🐦‍⬛ Crow perspective: Scavenger - no prey, fears hawks
        if (entity.species === 'crow') {
            if (other.species === 'hawk') {
                stimuli.push({ type: 'predator', entityId: other.id, dist });
                if (!nearestPredator || dist < nearestPredator.dist) nearestPredator = { entityId: other.id, dist };
            }
        }
    }

    // Detect world objects
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

            case 'perch':
                stimuli.push({ type: 'perch', objectId: obj.id, dist });
                break;
        }
    }

    // Sort by distance
    stimuli.sort((a, b) => a.dist - b.dist);

    return {
        stimuli,
        nearestPrey,
        nearestPredator,
        nearestWater,
        nearestBush,
        nearestTrash,
        nearestIntruder,
    };
}

// ============================================
// Helper Functions
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
