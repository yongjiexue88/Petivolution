
import { ChunkManager } from '../frontend/src/sim/core/chunkManager';
import { SimulationState } from '../frontend/src/sim/core/tick';
import { V1 } from '../frontend/src/shared/constants';
import { EntityRuntime, DEFAULT_WORLD_RULES } from '../frontend/src/shared/types';

// Mock Simulation State
const mockSim: SimulationState = {
    tick: 0,
    seed: 12345,
    timeOfDay: 0,
    mapId: 'test_map',
    entities: new Map<string, EntityRuntime>(),
    objects: new Map(),
    graveyard: [],
    pendingEvents: [],
    cameraCenter: { x: 0, y: 0 },
    cameraZoom: 1,
    rng: Math.random,
    stats: {
        birthsThisMinute: 0,
        deathsThisMinute: 0,
        lastMinuteTick: 0,
        ecoStress: 0,
    },
    chunkManager: null as any, // Will circle back
    rules: {
        ...DEFAULT_WORLD_RULES, // Use default as base
        capsEnabled: false
    },
    viewRectTiles: { leftTx: 0, topTy: 0, rightTx: 256, bottomTy: 256 }
};

const chunkManager = new ChunkManager();
mockSim.chunkManager = chunkManager;

console.log('🧪 Testing Random Spawn Distribution...');
console.log(`Map Dimensions: ${V1.defaultMapWidth} x ${V1.defaultMapHeight}`);

// Run Initialization
chunkManager.initializeWorld(mockSim, true);

const entities = Array.from(mockSim.entities.values());
console.log(`\nSpawned ${entities.length} entities.`);

if (entities.length === 0) {
    console.error('❌ No entities spawned!');
    process.exit(1);
}

// Analyze Distribution
let minTx = Infinity, maxTx = -Infinity;
let minTy = Infinity, maxTy = -Infinity;
const quadrants = [0, 0, 0, 0]; // LT, RT, LB, RB

for (const entity of entities) {
    const tx = entity.pos.x / V1.tileSizePx; // stored as pixels
    const ty = entity.pos.y / V1.tileSizePx;

    minTx = Math.min(minTx, tx);
    maxTx = Math.max(maxTx, tx);
    minTy = Math.min(minTy, ty);
    maxTy = Math.max(maxTy, ty);

    const left = tx < V1.defaultMapWidth / 2;
    const top = ty < V1.defaultMapHeight / 2;

    if (left && top) quadrants[0]++;
    else if (!left && top) quadrants[1]++;
    else if (left && !top) quadrants[2]++;
    else quadrants[3]++;
}

console.log(`\n📊 Distribution Stats:`);
console.log(`X Range: ${minTx.toFixed(0)} - ${maxTx.toFixed(0)} (Map: 0-${V1.defaultMapWidth})`);
console.log(`Y Range: ${minTy.toFixed(0)} - ${maxTy.toFixed(0)} (Map: 0-${V1.defaultMapHeight})`);

console.log(`\nQuadrant Counts (Should be roughly equal):`);
console.log(`Top-Left:     ${quadrants[0]}`);
console.log(`Top-Right:    ${quadrants[1]}`);
console.log(`Bottom-Left:  ${quadrants[2]}`);
console.log(`Bottom-Right: ${quadrants[3]}`);

// Basic Checks
const spreadX = maxTx - minTx;
const spreadY = maxTy - minTy;
const passedSpread = spreadX > V1.defaultMapWidth * 0.8 && spreadY > V1.defaultMapHeight * 0.8;

if (passedSpread) {
    console.log('\n✅ PASS: Entities are widely distributed across the map.');
} else {
    console.log('\n❌ FAIL: Entities seem clustered or range is too small.');
}

// Check for "Top-Left Corner Bug" specifically
// If > 90% are in TL quadrant, it's suspicious given even distribution
const ratioTL = quadrants[0] / entities.length;
if (ratioTL > 0.9) {
    console.log('⚠️ WARNING: Heavily skewed to Top-Left. The bug might still be present.');
}
