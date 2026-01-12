// ============================================
// V1 Global Constants & Config - Fishbowl Sandbox
// ============================================

export const V1 = {
    schemaVersion: 1,

    // Time
    simTickHz: 15,              // Fixed step simulation (15 recommended)
    snapshotHz: 10,             // worker -> main Snapshot Hz
    perceptionEveryNTicks: 5,   // Perception Frequency
    decisionEveryNTicks: 10,    // Decision Frequency

    // Visual/Units (Unified in tiles)
    tileSizePx: 16,             // Pixel art standard 16/32
    worldUnits: 'tile' as const,

    // Distance & Penalties
    maxSenseRadiusTiles: 14,    // V1 Max Sense Radius
    chaseTimeoutTicks: 15 * 10, // Max chase 10s

    // ============================================
    // V1 Fishbowl World - Finite but "looks big"
    // ============================================

    // World Size (256x256 tiles)
    defaultMapWidth: 256,
    defaultMapHeight: 256,
    chunkSize: 32,              // 32×32 tiles per chunk = 8×8 chunks total

    // Active Zone
    activeZoneRadiusTiles: 50,  // Main player observation area

    // Ecosystem density targets (balanced for ~60% stress)
    // All species have min: 2 to ensure mating pairs exist
    // Prey species have higher max than predators
    densityTargets: {
        rat: { min: 2, max: 30 },        // prey, abundant
        cat: { min: 2, max: 20 },        // predator
        chicken: { min: 2, max: 25 },    // prey
        smallBird: { min: 2, max: 25 },  // prey
        raccoon: { min: 2, max: 15 },    // omnivore
        crow: { min: 2, max: 20 },       // scavenger
        dog: { min: 2, max: 10 },        // apex predator (guardian)
        fox: { min: 2, max: 15 },        // predator
        hawk: { min: 2, max: 10 },       // apex predator
        wolf: { min: 2, max: 10 },       // apex predator
        snake: { min: 2, max: 15 },      // predator
    },

    // Density cap per chunk (Prevent overcrowding)
    capPerChunk: {
        rat: 20,
        cat: 15,
        chicken: 15,
        smallBird: 15,
        raccoon: 15,
        crow: 10,
        dog: 12,
        fox: 14,
        hawk: 12,
        wolf: 15,
        snake: 16,
    },

    // Default initial spawns (balanced prey/predator ratio)
    // Prey species: 6-8, Predators: 3-4, Apex: 2
    defaultSpawns: {
        rat: 8,        // prey base
        cat: 4,        // predator
        chicken: 6,    // prey
        smallBird: 6,  // prey
        raccoon: 3,    // omnivore
        crow: 4,       // scavenger
        dog: 2,        // guardian (rare)
        fox: 3,        // predator
        hawk: 2,       // apex (rare)
        wolf: 2,       // apex (rare)
        snake: 3,      // predator
        water: 6,      // increased for more drinking spots
        trash: 4,      // increased for food sources
        bush: 20,      // shelter/foraging
        perch: 10,     // bird rest spots
    },

    // Ecosystem Maintainer
    maintainerIntervalSec: 5,   // Check ecosystem balance every 5s
    maintainerIntervalTicks: 15 * 5, // 75 ticks

    // Snapshot Entity Fields (Avoid large payloads)
    snapshotEntityFields: [
        'id', 'species', 'name', 'x', 'y',
        'facing', 'anim', 'state', 'hp01', 'selected'
    ] as const,

    // V1.1 God Mode
    godMode: {
        maxGP: 100,
        startGP: 60,
        regenPerSnapshot: 0.0333, // ~ 1 GP / 3s
        costs: {
            spawn: {
                rat: 2,
                cat: 8,
                chicken: 4,
                smallBird: 3,
            },
            place: {
                water: 10,
                bush: 4,
                trash: 6,
                perch: 5,
            },
            action: {
                emergencyAid: 15,
            }
        },
        cooldowns: {
            emergencyAid: 120, // seconds
        }
    },
} as const;


export type TimeScale = 0 | 1 | 2 | 4;
