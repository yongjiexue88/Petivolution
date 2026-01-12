// ============================================
// Ecosystem Maintainer
// ============================================
// 
// Every 5 seconds, ensures drama happens on-screen by:
// - Spawning rats near resources if too few
// - Spawning cats at edges if too few
// - Adjusting behavior if too many
//

import { SimulationState } from './tick';
import { spawnEntity } from './spawner';
import { V1 } from '@shared/constants';
import type { SpeciesId, EcoStressDetails } from '@shared/types';

const TILE_PX = V1.tileSizePx;

/**
 * Get the active zone boundaries based on camera position
 */
export function getActiveZone(sim: SimulationState): {
    centerX: number;
    centerY: number;
    radiusPx: number;
} {
    return {
        centerX: sim.cameraCenter.x,
        centerY: sim.cameraCenter.y,
        radiusPx: V1.activeZoneRadiusTiles * TILE_PX,
    };
}

/**
 * Count entities within the active zone
 */
export function countEntitiesInZone(sim: SimulationState): { rat: number; cat: number } {
    const zone = getActiveZone(sim);
    const counts = { rat: 0, cat: 0 };

    for (const entity of sim.entities.values()) {
        if (entity.state === 'dead') continue;

        const dx = entity.pos.x - zone.centerX;
        const dy = entity.pos.y - zone.centerY;
        const distSq = dx * dx + dy * dy;
        const radiusSq = zone.radiusPx * zone.radiusPx;

        if (distSq <= radiusSq) {
            if (entity.species === 'rat') counts.rat++;
            else if (entity.species === 'cat') counts.cat++;
        }
    }

    return counts;
}

/**
 * Find a resource object (trash, water, bush) in the active zone
 */
function findResourceInZone(
    sim: SimulationState,
    resourceType: 'trash' | 'water' | 'bush'
): { tx: number; ty: number } | null {
    const zone = getActiveZone(sim);

    for (const obj of sim.objects.values()) {
        if (obj.type !== resourceType) continue;

        const objX = obj.pos.tx * TILE_PX;
        const objY = obj.pos.ty * TILE_PX;

        const dx = objX - zone.centerX;
        const dy = objY - zone.centerY;
        const distSq = dx * dx + dy * dy;
        const radiusSq = zone.radiusPx * zone.radiusPx;

        if (distSq <= radiusSq) {
            return obj.pos;
        }
    }

    return null;
}

/**
 * Spawn an entity near a resource (for rats attracted to trash)
 */
function spawnNearResource(
    sim: SimulationState,
    species: SpeciesId,
    resourceType: 'trash' | 'water' | 'bush'
): boolean {
    const resource = findResourceInZone(sim, resourceType);

    if (!resource) {
        // No resource found, spawn near camera center
        const centerTx = Math.floor(sim.cameraCenter.x / TILE_PX);
        const centerTy = Math.floor(sim.cameraCenter.y / TILE_PX);

        // Offset randomly within a small radius
        const offsetX = Math.floor((sim.rng() - 0.5) * 20);
        const offsetY = Math.floor((sim.rng() - 0.5) * 20);

        const entity = spawnEntity(sim, species, getRandomName(species, sim), 'cautious', {
            tx: centerTx + offsetX,
            ty: centerTy + offsetY,
        });

        return entity !== null;
    }

    // Spawn within 5 tiles of the resource
    const offsetX = Math.floor((sim.rng() - 0.5) * 10);
    const offsetY = Math.floor((sim.rng() - 0.5) * 10);

    const entity = spawnEntity(sim, species, getRandomName(species, sim), 'cautious', {
        tx: resource.tx + offsetX,
        ty: resource.ty + offsetY,
    });

    return entity !== null;
}

/**
 * Spawn an entity at the edge of the active zone (walks in naturally)
 */
function spawnAtEdge(sim: SimulationState, species: SpeciesId): boolean {
    const zone = getActiveZone(sim);

    // Random angle around the edge
    const angle = sim.rng() * Math.PI * 2;
    const edgeX = zone.centerX + Math.cos(angle) * zone.radiusPx * 0.9;
    const edgeY = zone.centerY + Math.sin(angle) * zone.radiusPx * 0.9;

    // For infinite world, we don't clamp to hard bounds.
    const tx = Math.floor(edgeX / TILE_PX);
    const ty = Math.floor(edgeY / TILE_PX);

    const entity = spawnEntity(sim, species, getRandomName(species, sim), 'brave', {
        tx,
        ty,
    });

    return entity !== null;
}

/**
 * Generate a random name for an entity
 */
function getRandomName(species: SpeciesId, sim: SimulationState): string {
    const names: Record<string, string[]> = {
        rat: ['Ratty', 'Pip', 'Squeak', 'Nibbles', 'Whiskers'],
        cat: ['Kitty', 'Tom', 'Luna', 'Shadow', 'Simba'],
        chicken: ['Cluck', 'Nugget'],
        smallBird: ['Tweet', 'Chirp'],
    };

    const nameList = names[species] || ['Unknown'];
    const name = nameList[Math.floor(sim.rng() * nameList.length)];
    const suffix = Math.floor(sim.rng() * 99);

    return `${name}${suffix}`;
}

/**
 * Main ecosystem maintenance function - called every 5 seconds
 * Acts as a "thermostat" to keep drama happening on-screen
 */
export function maintainEcosystem(sim: SimulationState): void {
    const counts = countEntitiesInZone(sim);
    const targets = V1.densityTargets;

    // === RAT MAINTENANCE ===
    if (counts.rat < targets.rat.min) {
        // Too few rats - spawn near trash/food sources
        // Spawn 1-3 rats to gradually restore population
        const deficit = targets.rat.min - counts.rat;
        const toSpawn = Math.min(deficit, 3);

        for (let i = 0; i < toSpawn; i++) {
            spawnNearResource(sim, 'rat', 'trash');
        }

        console.log(`🐭 Ecosystem: Added ${toSpawn} rats (was ${counts.rat}, target ${targets.rat.min}+)`);
    }

    // === CAT MAINTENANCE ===
    if (counts.cat < targets.cat.min) {
        // Too few cats - spawn at edge (cat "migrates in")
        spawnAtEdge(sim, 'cat');
        console.log(`🐱 Ecosystem: Cat migrated in (was ${counts.cat}, target ${targets.cat.min}+)`);
    }

    // === OVERPOPULATION HANDLING ===
    // Note: We don't forcibly kill animals, but the AI system handles:
    // - Rats die naturally from predation, starvation, thirst
    // - Cats leave the area if game is scarce (patrol expands)
    // - High-density areas have faster resource depletion

    if (counts.rat > targets.rat.max) {
        // Log warning but let natural causes handle it
        console.log(`⚠️ Ecosystem: Rat overpopulation (${counts.rat}/${targets.rat.max})`);
    }

    if (counts.cat > targets.cat.max) {
        console.log(`⚠️ Ecosystem: Cat surplus (${counts.cat}/${targets.cat.max})`);
    }

    // === V1.1 EcoStress Calculation (Improved) ===
    // Uses global counts for all species, not just zone-based rat/cat
    // Goals:
    // - Target ~60% stress when balanced
    // - Reward species diversity (all species meeting minimum)
    // - Penalize underpopulation more than overpopulation

    // Count all species globally
    const allCounts: Record<string, number> = {};
    for (const species of Object.keys(targets)) {
        allCounts[species] = 0;
    }
    for (const entity of sim.entities.values()) {
        if (entity.state === 'dead') continue;
        if (allCounts[entity.species] !== undefined) {
            allCounts[entity.species]++;
        }
    }

    let totalPopulationStress = 0;
    let speciesCount = 0;
    let speciesWithMinPopulation = 0;

    // Prepare details for UI
    const speciesStatusList: EcoStressDetails['speciesStatus'] = [];

    for (const [speciesKey, target] of Object.entries(targets)) {
        const currentCount = allCounts[speciesKey] || 0;
        const ideal = (target.min + target.max) / 2;

        let status: EcoStressDetails['speciesStatus'][0]['status'] = 'ok';
        let speciesStress = 0;

        // Track species meeting minimum population requirement
        if (currentCount >= target.min) {
            speciesWithMinPopulation++;
        }

        if (ideal > 0) {
            if (currentCount < target.min) {
                // Critical: below minimum, high stress (1.0 - 2.0)
                speciesStress = 1.0 + (target.min - currentCount) / target.min;
                status = 'critical_low';
            } else if (currentCount > target.max) {
                // Overpopulation: moderate stress (0.5 - 1.0)
                speciesStress = 0.5 + (currentCount - target.max) / target.max * 0.5;
                status = currentCount > target.max * 1.5 ? 'critical_high' : 'high';
            } else {
                // Within range: low stress based on distance from ideal (0 - 0.5)
                speciesStress = Math.abs(currentCount - ideal) / ideal * 0.5;
                if (speciesStress > 0.25) status = currentCount < ideal ? 'low' : 'high';
            }
            totalPopulationStress += speciesStress;
            speciesCount++;
        }

        speciesStatusList.push({
            id: speciesKey as SpeciesId,
            count: currentCount,
            min: target.min,
            max: target.max,
            stress: Math.floor(speciesStress * 100),
            status: status
        });
    }

    if (speciesCount > 0) {
        // Diversity ratio: what percentage of species have min population
        const diversityRatio = speciesWithMinPopulation / speciesCount;
        // Base stress from population deviation (scale to ~30-40 when balanced)
        const rawStress = (totalPopulationStress / speciesCount) * 40;
        // Diversity penalty: if species are missing, add stress (up to 30)
        const diversityPenalty = (1 - diversityRatio) * 30;

        // Final stress: raw + diversity penalty, clamped to 0-100
        const finalStress = Math.min(100, Math.max(0, Math.floor(rawStress + diversityPenalty)));
        sim.stats.ecoStress = finalStress;

        // Populate details for UI
        sim.stats.ecoStressDetails = {
            speciesStatus: speciesStatusList,
            diversityScore: Math.floor(diversityRatio * 100),
            diversityPenalty: Math.floor(diversityPenalty),
            populationStress: Math.floor(rawStress)
        };
    }
}
