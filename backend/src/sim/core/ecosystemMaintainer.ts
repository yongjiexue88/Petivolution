// ============================================
// Ecosystem Maintainer
// ============================================
// 
// Every 5 seconds, ensures the ecosystem is healthy by:
// - Monitoring global population counts
// - Spawning animals randomly across the map if populations are low (Shift+A strategy)
// 
// Matches the "Shift+A" initialization logic but runs continuously.
//

import { SimulationState } from './tick';
import { spawnEntity } from './spawner';
import { V1 } from '../../shared/constants';
import type { SpeciesId, EcoStressDetails } from '../../shared/types';

/**
 * Count entities globally
 */
export function countEntitiesGlobal(sim: SimulationState): Record<SpeciesId, number> {
    // Initialize counts for all species in densityTargets
    const counts: Record<string, number> = {};
    for (const species of Object.keys(V1.densityTargets)) {
        counts[species] = 0;
    }

    for (const entity of sim.entities.values()) {
        if (entity.state === 'dead') continue;
        if (counts[entity.species] !== undefined) {
            counts[entity.species]++;
        } else {
            counts[entity.species] = (counts[entity.species] || 0) + 1;
        }
    }

    return counts as Record<SpeciesId, number>;
}

/**
 * Spawn an entity randomly across the entire map
 * (Same strategy as Shift+A / ChunkManager.spawnInitialAnimals)
 */
function spawnRandomlyGlobal(sim: SimulationState, species: SpeciesId): boolean {
    // Random position across the entire map
    const tx = Math.floor(sim.rng() * V1.defaultMapWidth);
    const ty = Math.floor(sim.rng() * V1.defaultMapHeight);

    const name = getRandomName(species, sim);
    const personality = getRandomPersonality(species, sim);

    const entity = spawnEntity(sim, species, name, personality, {
        tx,
        ty,
    });

    return entity !== null;
}

/**
 * Determine personality based on species (matching ChunkManager logic)
 */
function getRandomPersonality(species: SpeciesId, sim: SimulationState): 'curious' | 'cautious' | 'brave' {
    // Default weighted roll
    let personality: 'curious' | 'cautious' | 'brave' = 'curious';
    const pRoll = sim.rng();
    if (pRoll < 0.33) personality = 'cautious';
    else if (pRoll < 0.66) personality = 'brave';

    // Species specific overrides (matching ChunkManager)
    if (['rat', 'chicken', 'smallBird'].includes(species)) {
        personality = sim.rng() > 0.5 ? 'cautious' : 'curious';
    } else if (['cat', 'dog', 'wolf', 'hawk', 'fox'].includes(species)) {
        personality = sim.rng() > 0.5 ? 'brave' : 'curious';
    }

    return personality;
}

/**
 * Generate a random name for an entity
 */
function getRandomName(species: SpeciesId, sim: SimulationState): string {
    const names: Record<string, string[]> = {
        rat: ['Ratty', 'Pip', 'Squeak', 'Nibbles', 'Whiskers', 'Remi', 'Scabbers', 'Twitch'],
        cat: ['Kitty', 'Tom', 'Luna', 'Shadow', 'Simba', 'Felix', 'Garfield', 'Nala'],
        chicken: ['Cluck', 'Nugget', 'Peck', 'Feathers', 'Eggbert', 'Henny'],
        smallBird: ['Tweet', 'Chirp', 'Sky', 'Blue', 'Robin', 'Pip'],
        raccoon: ['Bandit', 'Rocket', 'Sly', 'Meeko', 'Rascal'],
        crow: ['Poe', 'Odin', 'Midnight', 'Raven', 'Caw'],
        dog: ['Rex', 'Buddy', 'Max', 'Spot', 'Rover', 'Bolt'],
        fox: ['Foxy', 'Red', 'Sly', 'Vixey', 'Todd'],
        hawk: ['Talon', 'Soar', 'Hunter', 'Sky', 'Sharp'],
        wolf: ['Fang', 'Ghost', 'Alpha', 'Luna', 'Howl'],
        snake: ['Slither', 'Hiss', 'Nagini', 'Ka', 'Coil'],
    };

    const nameList = names[species] || ['Unknown'];
    const name = nameList[Math.floor(sim.rng() * nameList.length)];
    const suffix = Math.floor(sim.rng() * 999);

    return `${name}${suffix}`;
}

/**
 * Main ecosystem maintenance function - called every 5 seconds
 * Acts as a "thermostat" to keep global population healthy
 */
export function maintainEcosystem(sim: SimulationState): void {
    const counts = countEntitiesGlobal(sim);
    const targets = V1.densityTargets;

    for (const [speciesKey, target] of Object.entries(targets)) {
        const species = speciesKey as SpeciesId;
        const currentCount = counts[species] || 0;

        // === MIN POPULATION CHECK ===
        if (currentCount < target.min) {
            // Need to spawn more
            const deficit = target.min - currentCount;
            // Spawn a batch, but cap to avoid lag spikes
            const toSpawn = Math.min(deficit, 2);

            if (toSpawn > 0) {
                let successCount = 0;

                for (let i = 0; i < toSpawn; i++) {
                    // Use Global Random Spawn (Shift+A strategy)
                    const success = spawnRandomlyGlobal(sim, species);
                    if (success) successCount++;
                }

                if (successCount > 0) {
                    console.log(`🌿 Ecosystem: Added ${successCount} ${species} (current: ${currentCount + successCount}, target: ${target.min}+)`);
                }
            }
        }
    }

    // === V1.1 EcoStress Calculation (Improved) ===
    // Goals:
    // - Target ~60% stress when balanced
    // - Reward species diversity (all species meeting minimum)
    // - Penalize underpopulation more than overpopulation
    let totalPopulationStress = 0;
    let speciesCount = 0;
    let speciesWithMinPopulation = 0;

    // Prepare details for UI
    const speciesStatusList: EcoStressDetails['speciesStatus'] = [];

    for (const [speciesKey, target] of Object.entries(targets)) {
        const species = speciesKey as SpeciesId;
        const currentCount = counts[species] || 0;
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
            id: species,
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

