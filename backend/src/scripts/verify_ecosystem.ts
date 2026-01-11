import { createSimulation, simulateTick } from '../sim/core/tick';
import { V1 } from '@shared/constants';

const SIM_DURATION_SEC = 20; // Short run for check, logic runs fast
// For robust check, maybe 60s
const TARGET_DURATION_SEC = 60;
const TICKS = TARGET_DURATION_SEC * V1.simTickHz;

console.log(`🧪 Starting Ecosystem Verification for ${TICKS} ticks (${TARGET_DURATION_SEC}s)...`);

const sim = createSimulation(Date.now(), 'verify_map');
sim.chunkManager.initializeWorld(sim);

// Pre-check
console.log(`Initial Entities: ${sim.entities.size}`);
console.log(`Initial Objects: ${sim.objects.size}`);

// Run Simulation
const start = Date.now();
for (let i = 0; i < TICKS; i++) {
    simulateTick(sim);

    if (i % (V1.simTickHz * 10) === 0) {
        process.stdout.write('.');
    }
}
const elapsed = Date.now() - start;
console.log(`\n✅ Simulation Complete in ${(elapsed / 1000).toFixed(2)}s runtime.`);

// Verification
const stats = {
    rats: 0,
    cats: 0,
    deadRats: 0,
    deadPredators: 0,
    starvedPredators: 0,
};

for (const e of sim.entities.values()) {
    if (e.species === 'rat') stats.rats++;
    if (e.species === 'cat') stats.cats++;
}

for (const g of sim.graveyard) {
    if (g.species === 'rat') stats.deadRats++;
    if (['cat', 'dog', 'fox', 'wolf', 'hawk'].includes(g.species)) {
        stats.deadPredators++;
        if (g.reason === 'starvation') stats.starvedPredators++;
    }
}

console.log('\n📊 Results:');
console.log(`Rats: ${stats.rats} (Dead: ${stats.deadRats})`);
console.log(`Cats: ${stats.cats}`);
console.log(`Predator Deaths: ${stats.deadPredators} (Starved: ${stats.starvedPredators})`);

// Assertions
const errors: string[] = [];

if (stats.rats < 10) errors.push('FAIL: Rat population collapsed (<10)');
// Cat target is 4-5. Min 2 is safe check.
if (stats.cats < 2) errors.push(`FAIL: Cat population collapsed (${stats.cats} < 2)`);

if (stats.starvedPredators > stats.deadPredators * 0.5 && stats.deadPredators > 5) {
    errors.push(`FAIL: High predator starvation rate (${(stats.starvedPredators / stats.deadPredators * 100).toFixed(1)}%)`);
}

// Resource Integrity
let pondWater = 0;
let urbanTrash = 0;
for (const obj of sim.objects.values()) {
    const cx = Math.floor(obj.pos.tx / 32);
    const cy = Math.floor(obj.pos.ty / 32);
    if (obj.type === 'water' && cx === 3 && cy === 3) pondWater++;
    if (obj.type === 'trash' && cx === 4 && cy === 4) urbanTrash++;
}

if (pondWater < 2) errors.push(`FAIL: Pond water missing (${pondWater}/2)`);
if (urbanTrash < 2) errors.push(`FAIL: Urban trash missing (${urbanTrash}/2)`);

if (errors.length > 0) {
    console.error('\n❌ Verification FAILED:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
} else {
    console.log('\n✅ Verification PASSED: Ecosystem is stable.');
    process.exit(0);
}
