
import {
    EntityRuntime,
    SpeciesId,
    Personality,
    TilePos,
} from '@shared/types';
import { V1 } from '@shared/constants';
import { v4 as uuid } from 'uuid';
import { SimulationState } from './tick';

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
