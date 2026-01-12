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
import type { SpeciesId } from '@shared/types';

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

    // === V1.1 EcoStress Calculation ===
    // Stress = Abs(Current - Ideal) / Ideal * 100 (Average of species)
    // Ideal is average of min/max.
    const ratIdeal = (targets.rat.min + targets.rat.max) / 2;
    const catIdeal = (targets.cat.min + targets.cat.max) / 2;

    const ratStress = Math.abs(counts.rat - ratIdeal) / ratIdeal;
    const catStress = Math.abs(counts.cat - catIdeal) / catIdeal;

    // Combine: 70% Rat (main pop), 30% Cat
    const totalStress = (ratStress * 0.7 + catStress * 0.3) * 100;

    sim.stats.ecoStress = Math.min(100, Math.floor(totalStress));
}
