// ============================================
// Ecosystem Maintainer - 生态恒温器
// ============================================
// 
// Every 5 seconds, ensures drama happens on-screen by:
// - Spawning rats near resources if too few
// - Spawning cats at edges if too few
// - Adjusting behavior if too many
//

import { SimulationState } from './tick';
import { spawnEntity, SpawnOptions } from './spawner';
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
        // No resource found - spawn on ring edge (60%-100% radius)
        // This creates a "migration" feel instead of appearing at camera center
        const angle = sim.rng() * Math.PI * 2;
        const radiusMin = V1.activeZoneRadiusTiles * 0.6;
        const radiusMax = V1.activeZoneRadiusTiles * 1.0;
        const radius = radiusMin + sim.rng() * (radiusMax - radiusMin);

        const spawnX = sim.cameraCenter.x + Math.cos(angle) * radius * TILE_PX;
        const spawnY = sim.cameraCenter.y + Math.sin(angle) * radius * TILE_PX;

        // Clamp to world bounds
        const worldMaxPx = V1.defaultMapWidth * TILE_PX;
        const clampedX = Math.max(TILE_PX, Math.min(spawnX, worldMaxPx - TILE_PX));
        const clampedY = Math.max(TILE_PX, Math.min(spawnY, worldMaxPx - TILE_PX));

        // Calculate direction toward camera center (migration direction)
        const dirX = sim.cameraCenter.x - clampedX;
        const dirY = sim.cameraCenter.y - clampedY;
        const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
        const spawnOptions: SpawnOptions = {
            spawnReason: 'ring_fallback',
            spawnDirection: { x: dirX / dirLen, y: dirY / dirLen },
        };

        const entity = spawnEntity(sim, species, getRandomName(species, sim), 'cautious', {
            tx: Math.floor(clampedX / TILE_PX),
            ty: Math.floor(clampedY / TILE_PX),
        }, spawnOptions);

        if (entity) {
            console.log(`🔄 Spawn: ${species} via ring_fallback at (${Math.floor(clampedX)}, ${Math.floor(clampedY)}) → toward center`);
        }

        return entity !== null;
    }

    // Spawn within 5 tiles of the resource
    const offsetX = Math.floor((sim.rng() - 0.5) * 10);
    const offsetY = Math.floor((sim.rng() - 0.5) * 10);

    const entity = spawnEntity(sim, species, getRandomName(species, sim), 'cautious', {
        tx: resource.tx + offsetX,
        ty: resource.ty + offsetY,
    }, { spawnReason: 'near_resource' });

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

    // Clamp to world bounds
    const worldMaxPx = V1.defaultMapWidth * TILE_PX;
    const clampedX = Math.max(TILE_PX, Math.min(edgeX, worldMaxPx - TILE_PX));
    const clampedY = Math.max(TILE_PX, Math.min(edgeY, worldMaxPx - TILE_PX));
    const tx = Math.floor(clampedX / TILE_PX);
    const ty = Math.floor(clampedY / TILE_PX);

    // Calculate direction toward camera center (migration direction)
    const dirX = zone.centerX - clampedX;
    const dirY = zone.centerY - clampedY;
    const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    const spawnOptions: SpawnOptions = {
        spawnReason: 'migration',
        spawnDirection: { x: dirX / dirLen, y: dirY / dirLen },
    };

    const entity = spawnEntity(sim, species, getRandomName(species, sim), 'brave', {
        tx,
        ty,
    }, spawnOptions);

    if (entity) {
        console.log(`🐾 Migration: ${species} entered from edge at (${tx * TILE_PX}, ${ty * TILE_PX}) → toward center`);
    }

    return entity !== null;
}

/**
 * Generate a random name for an entity
 */
function getRandomName(species: SpeciesId, sim: SimulationState): string {
    const names = {
        cat: ['Tiger', 'Shadow', 'Luna', 'Simba', 'Oreo', 'Whiskers', 'Felix', 'Mittens'],
        rat: ['Squeaky', 'Pip', 'Cheese', 'Scurry', 'Nibbles', 'Dusty', 'Scout', 'Rustle'],
        chicken: ['Clucky', 'Nugget', 'Peckers', 'Eggbert', 'Scratchy', 'Feathers'],
        smallBird: ['Tweety', 'Sky', 'Blue', 'Chirp', 'Sunny', 'Cloud'],
        raccoon: ['Bandit', 'Rocket', 'Sly', 'Meeko', 'Ziggy', 'Rigby'],
        crow: ['Raven', 'Poe', 'Odin', 'Midnight', 'Onyx', 'Blackie'],
        dog: ['Buddy', 'Max', 'Bella', 'Charlie', 'Daisy', 'Rocky'],
        fox: ['Rusty', 'Red', 'Sly', 'Foxy', 'Vixen', 'Shadow'],
        wolf: ['Fang', 'Ghost', 'Luna', 'Shadow', 'Grey', 'Spirit'],
        hawk: ['Talon', 'Soar', 'Hunter', 'Sky', 'Wind', 'Eye'],
        snake: ['Slither', 'Hiss', 'Fang', 'Venom', 'Coil', 'Noodle'],
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

    // === Resource Maintenance (V4) ===
    maintainResources(sim);
}

function maintainResources(sim: SimulationState): void {
    // 1. Count Resources in critical zones
    const counts = {
        pondWater: 0,
        urbanTrash: 0,
        fringeTrash: 0,
        cornerWater: 0,
    };

    const corners = ['1,1', '1,6', '6,1', '6,6'];
    const fringe = ['3,4', '4,3'];

    for (const obj of sim.objects.values()) {
        const cx = Math.floor(obj.pos.tx / 32);
        const cy = Math.floor(obj.pos.ty / 32);
        const id = `${cx},${cy}`;

        if (obj.type === 'water') {
            if (cx === 3 && cy === 3) counts.pondWater++;
            if (corners.includes(id)) counts.cornerWater++; // Total corners, easier check
        } else if (obj.type === 'trash') {
            if (cx === 4 && cy === 4) counts.urbanTrash++;
            if (fringe.includes(id)) counts.fringeTrash++;
        }
    }

    // 2. Enforce Minimums

    // Pond (3,3): 2 Water
    if (counts.pondWater < 2) {
        sim.chunkManager.spawnObject(sim, 'water', 3 * 32, 3 * 32);
        console.log('💧 Ecosystem: Restored Pond Water');
    }

    // Urban (4,4): 2 Trash
    if (counts.urbanTrash < 2) {
        sim.chunkManager.spawnObject(sim, 'trash', 4 * 32, 4 * 32);
        console.log('🗑️ Ecosystem: Restored Urban Trash');
    }

    // Fringe (3,4) & (4,3): 1 Trash each (Checking individually ideally, but total check roughly works)
    // Let's do individual checks for Fringe/Corners to be precise
    checkAndSpawn(sim, 'trash', 3, 4, 1);
    checkAndSpawn(sim, 'trash', 4, 3, 1);

    // Corners: 1 Water each
    checkAndSpawn(sim, 'water', 1, 1, 1);
    checkAndSpawn(sim, 'water', 1, 6, 1);
    checkAndSpawn(sim, 'water', 6, 1, 1);
    checkAndSpawn(sim, 'water', 6, 6, 1);
}

function checkAndSpawn(sim: SimulationState, type: 'water' | 'trash', cx: number, cy: number, min: number) {
    let count = 0;
    for (const obj of sim.objects.values()) {
        if (obj.type !== type) continue;
        const ocx = Math.floor(obj.pos.tx / 32);
        const ocy = Math.floor(obj.pos.ty / 32);
        if (ocx === cx && ocy === cy) count++;
    }

    if (count < min) {
        sim.chunkManager.spawnObject(sim, type as any, cx * 32, cy * 32); // as any to match type
        console.log(`♻️ Ecosystem: Restored ${type} at (${cx},${cy})`);
    }
}
