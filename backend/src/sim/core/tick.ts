// ============================================
// V1 Simulation Core - Tick Loop
// ============================================

import type {
    EntityRuntime,
    WorldObject,
    WorldRule,
    SnapshotEntity,
    SimStats,
    SimEvent,
    Vec2,
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
import { ChunkManager } from './chunkManager';
import { spawnEntity, canSpawn } from './spawner';
import { maintainEcosystem } from './ecosystemMaintainer';

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
// Simulation State
// ============================================

export interface SimulationState {
    tick: number;
    seed: number;
    timeOfDay: number; // 0..1
    mapId: string;

    entities: Map<string, EntityRuntime>;
    objects: Map<string, WorldObject>;
    graveyard: GraveyardEntry[];

    rules: WorldRule;

    // V3 Chunk System
    chunkManager: ChunkManager;

    // LOD
    cameraCenter: Vec2;
    cameraZoom: number;
    viewRectTiles?: { leftTx: number, topTy: number, rightTx: number, bottomTy: number };

    // RNG
    rng: () => number;

    // Event Buffer
    pendingEvents: SimEvent[];

    // Stats
    stats: {
        birthsThisMinute: number;
        deathsThisMinute: number;
        lastMinuteTick: number;
        warning?: boolean; // V1.1
        ecoStress: number; // V1.1
    };

    // Selected Entity (for sending details)
    selectedEntityId?: string;
}

// ============================================
// Create Simulation
// ============================================

export function createSimulation(
    seed: number,
    mapId: string = 'garden_v1',
    rules: WorldRule = DEFAULT_WORLD_RULES
): SimulationState {
    return {
        tick: 0,
        seed,
        timeOfDay: 0.25, // Start at noon
        mapId,
        entities: new Map(),
        objects: new Map(),
        graveyard: [],
        rules,
        chunkManager: new ChunkManager(),
        cameraCenter: { x: V1.defaultMapWidth * V1.tileSizePx / 2, y: V1.defaultMapHeight * V1.tileSizePx / 2 },
        cameraZoom: 1,
        viewRectTiles: undefined,
        rng: createSeededRandom(seed),
        pendingEvents: [],
        stats: {
            birthsThisMinute: 0,
            deathsThisMinute: 0,
            lastMinuteTick: 0,
            ecoStress: 0,
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
// Main Loop
// ============================================

export function simulateTick(sim: SimulationState): void {
    if (sim.rules.timeScale === 0) return;

    const ticksToRun = sim.rules.timeScale;

    for (let i = 0; i < ticksToRun; i++) {
        sim.tick++;

        // V3: Update LOD / Streaming
        sim.chunkManager.updateLOD(sim);

        // Reset minute stats
        if (sim.tick - sim.stats.lastMinuteTick >= V1.simTickHz * 60) {
            sim.stats.birthsThisMinute = 0;
            sim.stats.deathsThisMinute = 0;
            sim.stats.lastMinuteTick = sim.tick;
        }

        // V1 Fishbowl: Ecosystem maintainer (every 5 seconds)
        if (sim.tick % V1.maintainerIntervalTicks === 0) {
            maintainEcosystem(sim);
        }

        const deadEntities: string[] = [];

        for (const [id, entity] of sim.entities) {
            if (entity.state === 'dead') continue;

            // ========================================
            // DISABLED LOD: All entities get full AI updates
            // Previously had hot/warm/cold chunk logic that froze distant animals
            // Now all animals are always active regardless of camera position
            // ========================================

            // Hot: Full Update
            // ========================================
            // 1. Every tick: Update vitals
            // ========================================
            updateVitals(entity, sim);

            // ========================================
            // 2. Check Death
            // ========================================
            if (entity.vitals.health01 <= 0) {
                handleDeath(entity, sim);
                deadEntities.push(id);
                continue;
            }

            // ========================================
            // 4. Perception (Every N ticks)
            // ========================================
            if (sim.tick % V1.perceptionEveryNTicks === 0 && sim.rules.ai.perceptionEnabled) {
                const perception = perceive(entity, sim);
                updateStimuli(entity, perception);
                entity.ai.lastPerceptionTick = sim.tick;
            }

            // ========================================
            // 5. Decision (Every N ticks)
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
            // 6. Chase Timeout Check
            // ========================================
            if (entity.state === 'chase') {
                checkChaseTimeout(entity, sim);
            }

            // ========================================
            // 7. Every tick: Execute Action
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

        // Remove dead entities
        for (const id of deadEntities) {
            sim.entities.delete(id);
        }

        // Resource Regeneration (Every 10 ticks)
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

        // Challenge Check (Every 60 ticks = 1s)
        if (sim.tick % 60 === 0) {
            checkChallengeStatus(sim);
        }
    }
}

// ============================================
// Update Vitals
// ============================================

function updateVitals(entity: EntityRuntime, _sim: SimulationState): void {
    const config = SPECIES_CONFIGS[entity.species];
    const v = entity.vitals;

    // Consumption
    v.hunger01 = clamp01(v.hunger01 - config.vitals.hungerDecayPerTick);
    v.thirst01 = clamp01(v.thirst01 - config.vitals.thirstDecayPerTick);

    // Fatigue (Recovers when sleeping)
    if (entity.state === 'sleep') {
        v.fatigue01 = clamp01(v.fatigue01 + config.vitals.sleepGainPerTick);
    } else {
        v.fatigue01 = clamp01(v.fatigue01 - config.vitals.fatigueDecayPerTick);
    }

    // Health Recovery (If state is good)
    if (v.hunger01 > 0.3 && v.thirst01 > 0.3) {
        v.health01 = clamp01(v.health01 + 0.0002);
    }

    // Hunger/Thirst Damage
    if (v.hunger01 < config.vitals.dangerThreshold01) {
        v.health01 = clamp01(v.health01 - config.vitals.healthDamageWhenHungerBelow);
    }
    if (v.thirst01 < config.vitals.dangerThreshold01) {
        v.health01 = clamp01(v.health01 - config.vitals.healthDamageWhenThirstBelow);
    }
}

// ============================================
// Death Handling
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

    // Add to graveyard
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
        history: [...entity.history], // V1.1 Save life history
        path: [...entity.path],       // V1.1 Save path
    });

    // Send event
    const location = { x: entity.pos.x, y: entity.pos.y };
    let importance: 'S' | 'A' | 'B' | 'C' = 'B';
    if (reason === 'killed') importance = 'S';
    else if (reason === 'starvation') importance = 'A';

    const deathEvent: SimEvent = {
        type: 'DEATH',
        tick: sim.tick,
        entityId: entity.id,
        reason,
        killedBy: entity.dead?.killedBy,
        location,
        importance,
        tags: ['death', reason, entity.species],
        subjectName: entity.name,
    };

    sim.pendingEvents.push(deathEvent);
    // Also record in personal history
    entity.history.push(deathEvent);

    sim.stats.deathsThisMinute++;
}


// simplifiedUpdate removed - no longer used since LOD disabled


// ============================================
// Chase Timeout
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

    // 3. Check Hunger (must be well-fed)
    if (entity.vitals.hunger01 < rep.minHunger) return;

    // 4. Check Thirst (must not be thirsty)
    if (entity.vitals.thirst01 < 0.4) return;

    // 5. Check Fatigue (must not be tired)
    if (entity.vitals.fatigue01 < 0.3) return;

    // 6. Find a mate (same species, opposite sex, nearby, also ready to reproduce)
    const mate = findMate(entity, sim);
    if (!mate) return;

    // 7. Check Chance (prob per second)
    if (sim.rng() > rep.probabilityPerSecond) return;

    // 8. Check Global Cap
    if (!canSpawn(entity.species, sim)) return;

    // Apply Cost to both parents
    entity.vitals.hunger01 = Math.max(0, entity.vitals.hunger01 - rep.energyCost);
    mate.vitals.hunger01 = Math.max(0, mate.vitals.hunger01 - rep.energyCost * 0.5);
    entity.lastReproductionTick = sim.tick;
    mate.lastReproductionTick = sim.tick;

    spawnOffspring(entity, mate, sim);
}

/**
 * Find a suitable mate for sexual reproduction
 */
function findMate(entity: EntityRuntime, sim: SimulationState): EntityRuntime | null {
    const config = SPECIES_CONFIGS[entity.species];
    const mateRange = config.sense.radiusTiles ?? 8;
    const mateRangePx = mateRange * V1.tileSizePx;

    let bestMate: EntityRuntime | null = null;
    let bestDist = Infinity;

    for (const other of sim.entities.values()) {
        // Must be same species
        if (other.species !== entity.species) continue;
        // Must be opposite sex
        if (other.sex === entity.sex) continue;
        // Must not be self
        if (other.id === entity.id) continue;
        // Must be alive
        if (other.state === 'dead') continue;

        // Check distance
        const dx = other.pos.x - entity.pos.x;
        const dy = other.pos.y - entity.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > mateRangePx) continue;

        // Check if mate is also ready (well-fed, not tired)
        const rep = SPECIES_CONFIGS[other.species].reproduction;
        if (!rep?.enabled) continue;
        if (other.ageTicks < rep.minAgeTicks) continue;
        if (other.vitals.hunger01 < rep.minHunger) continue;
        if (other.vitals.thirst01 < 0.4) continue;
        if (other.vitals.fatigue01 < 0.3) continue;
        if (other.lastReproductionTick && (sim.tick - other.lastReproductionTick) < rep.cooldownTicks) continue;

        if (dist < bestDist) {
            bestDist = dist;
            bestMate = other;
        }
    }

    return bestMate;
}

function spawnOffspring(parent1: EntityRuntime, parent2: EntityRuntime, sim: SimulationState) {
    // Random position between parents
    const midX = (parent1.pos.x + parent2.pos.x) / 2;
    const midY = (parent1.pos.y + parent2.pos.y) / 2;
    const offset = (sim.rng() - 0.5) * V1.tileSizePx * 2;
    const spawnPos: TilePos = {
        tx: (midX + offset) / V1.tileSizePx,
        ty: (midY + offset) / V1.tileSizePx
    };

    // Inherit Personality (50% from parent1, 25% parent2, 25% random)
    const personalities: Personality[] = ['curious', 'cautious', 'brave'];
    const pRand = sim.rng();
    let childPersonality: Personality;
    if (pRand < 0.5) {
        childPersonality = parent1.personality;
    } else if (pRand < 0.75) {
        childPersonality = parent2.personality;
    } else {
        childPersonality = personalities[Math.floor(sim.rng() * personalities.length)];
    }

    const child = spawnEntity(sim, parent1.species, `${parent1.name} Jr.`, childPersonality, spawnPos);

    if (child) {
        // Link Family (two parents)
        child.parents = [parent1.id, parent2.id];
        child.generation = Math.max(parent1.generation, parent2.generation) + 1;

        parent1.children.push(child.id);
        parent2.children.push(child.id);

        // Record Event
        const birthEvent: SimEvent = {
            type: 'BIRTH',
            tick: sim.tick,
            entityId: child.id,
            parentId: parent1.id,
            location: { x: child.pos.x, y: child.pos.y },
            importance: 'B',
            tags: ['birth', child.species],
            subjectName: child.name,
        };
        sim.pendingEvents.push(birthEvent);
        parent1.history.push(birthEvent);
        parent2.history.push(birthEvent);
    }
}

// ============================================
// Stimulus Update
// ============================================

function updateStimuli(entity: EntityRuntime, perception: PerceptionResult): void {
    entity.ai.recentStimuli = perception.stimuli.slice(0, 6);
}

// ============================================
// Goal Transition
// ============================================

function transitionToGoal(entity: EntityRuntime, goal: Goal, _sim: SimulationState): void {
    // Reset chase state
    if (goal !== 'hunt') {
        entity.chaseTicks = undefined;
        entity.chaseStartPos = undefined;
    }

    // Map goal -> state
    const goalToState: Record<Goal, SimState> = {
        drink: 'moveTo',
        eat: 'moveTo',
        hunt: 'chase',
        rest: 'sleep',
        flee: 'flee',
        wander: 'wander',
        forage: 'peck',
        rummage: 'rummage',
        bark: 'bark',
        patrol: 'patrol',
        reproduce: 'wander' // Looking for a mate uses wander state
    };

    entity.state = goalToState[goal];
}

// ============================================
// Entity Spawning
// ============================================

// spawnEntity and canSpawn moved to ./spawner.ts

// ============================================
// Snapshot Generation
// ============================================

export function getSnapshot(sim: SimulationState): {
    tick: number;
    entities: SnapshotEntity[];
    objects: WorldObject[];
    stats: SimStats;
    events: SimEvent[];
} {
    const entities: SnapshotEntity[] = [];

    // Include ALL entities - no LOD filtering
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
            targetPos: (() => {
                return sim.rules.debug.showTargets ? getEntityTargetPos(entity, sim) : undefined;
            })(),
        });
    }

    // Include ALL objects - no LOD filtering
    const visibleObjects: WorldObject[] = [...sim.objects.values()];

    // Generic species counting
    const counts: Record<string, number> = {};
    for (const e of sim.entities.values()) {
        counts[e.species] = (counts[e.species] || 0) + 1;
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
        objects: visibleObjects,
        stats: {
            timeOfDay: sim.timeOfDay,
            rat: counts['rat'] || 0,
            cat: counts['cat'] || 0,
            chicken: counts['chicken'] || 0,
            smallBird: counts['smallBird'] || 0,
            raccoon: counts['raccoon'] || 0,
            crow: counts['crow'] || 0,
            dog: counts['dog'] || 0,
            fox: counts['fox'] || 0,
            hawk: counts['hawk'] || 0,
            wolf: counts['wolf'] || 0,
            snake: counts['snake'] || 0,
            deathsLastMin: sim.stats.deathsThisMinute,
            birthsLastMin: sim.stats.birthsThisMinute,
            warning: sim.stats.warning,
            currentSeed: sim.seed,
            ecoStress: sim.stats.ecoStress
        },
        events,
    };
}

function getAnimationName(entity: EntityRuntime): string {
    return `${entity.species}_${entity.state}`;
}

// ============================================
// Get Selected Entity Detail
// ============================================

export function getSelectedEntityDetail(sim: SimulationState): EntityRuntime | null {
    if (!sim.selectedEntityId) return null;
    return sim.entities.get(sim.selectedEntityId) ?? null;
}

function getEntityTargetPos(entity: EntityRuntime, sim: SimulationState): Vec2 | undefined {
    // 1. Direct Target Pos
    if (entity.targetPos) return entity.targetPos;

    // 2. Target Entity
    if (entity.targetEntityId) {
        const target = sim.entities.get(entity.targetEntityId);
        if (target) return target.pos;
    }

    // 3. Target Object
    if (entity.targetObjectId) {
        const obj = sim.objects.get(entity.targetObjectId);
        if (obj) {
            return {
                x: obj.pos.tx * V1.tileSizePx + V1.tileSizePx / 2,
                y: obj.pos.ty * V1.tileSizePx + V1.tileSizePx / 2
            };
        }
    }

    return undefined;
}

// ============================================
// Challenge Logic
// ============================================

function checkChallengeStatus(sim: SimulationState): void {
    const config = sim.rules.challenge;
    if (!config || !config.enabled) return;

    // Check Duration (Win Condition)
    if (sim.tick >= config.targetDurationTicks) {
        // Victory!
        // Emit 'CHALLENGE_WIN' event
        const event: SimEvent = {
            type: 'CHALLENGE_WIN', // Note: Might need to add to SimEvent type union if strict
            tick: sim.tick,
            entityId: 'SYSTEM',
            importance: 'S',
            location: { x: 0, y: 0 },
            tags: ['challenge', 'win'],
            subjectName: 'System',
            data: { message: `Challenge Complete! You survived ${config.targetDurationTicks / V1.simTickHz}s.` }
        } as any; // Cast to avoid strict union check for now if needed, or add to types.ts

        // Prevent spam
        if (!sim.pendingEvents.some(e => e.type === 'CHALLENGE_WIN')) {
            sim.pendingEvents.push(event);
        }
        return;
    }

    // Check Population (Fail Condition)
    const counts: Record<string, number> = {};
    for (const e of sim.entities.values()) {
        if (e.state !== 'dead') {
            counts[e.species] = (counts[e.species] || 0) + 1;
        }
    }

    let failed = false;
    let failReason = '';

    // Min Pop
    if (config.minPopulation) {
        for (const [species, min] of Object.entries(config.minPopulation)) {
            if ((counts[species] || 0) < min) {
                failed = true;
                failReason = `${species} population too low (<${min})`;
                break;
            }
        }
    }

    // Max Pop
    if (!failed && config.maxPopulation) {
        for (const [species, max] of Object.entries(config.maxPopulation)) {
            if ((counts[species] || 0) > max) {
                failed = true;
                failReason = `${species} population too high (>${max})`;
                break;
            }
        }
    }

    if (failed) {
        const event: SimEvent = {
            type: 'CHALLENGE_FAIL',
            tick: sim.tick,
            entityId: 'SYSTEM',
            importance: 'S',
            location: { x: 0, y: 0 },
            tags: ['challenge', 'fail'],
            subjectName: 'System',
            data: { message: `Challenge Failed: ${failReason}` }
        } as any;

        // Prevent spam - only send if we haven't failed recently? 
        // Or just send once.
        if (!sim.pendingEvents.some(e => e.type === 'CHALLENGE_FAIL')) {
            sim.pendingEvents.push(event);
        }
    }
}
