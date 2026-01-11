import { WorldServer } from '../src/world/WorldServer';
import { V1 } from '@shared/constants';
import * as EntityService from '../src/services/EntityService';
import * as SnapshotService from '../src/services/SnapshotService';
import { initializeFirebase } from '../src/config/firebaseConfig';

// Mock everything related to persistence
jest.mock('../src/services/EntityService');
jest.mock('../src/services/SnapshotService');
jest.mock('../src/config/firebaseConfig', () => ({
    initializeFirebase: jest.fn(),
    isFirebaseInitialized: jest.fn().mockReturnValue(true),
    getFirestore: jest.fn(),
}));

describe('Headless Simulation', () => {
    let world: WorldServer;

    // Silence logs
    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    beforeEach(() => {
        jest.useFakeTimers();
        world = new WorldServer();
        // Since we mocked SnapshotService.loadLatestSnapshot to return undefined (default mock),
        // WorldServer will start fresh.
    });

    afterEach(() => {
        world.stop();
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    test('Ecosystem should stabilize after 1000 ticks', async () => {
        // Start world
        world.start();

        // Fast forward 1000 ticks
        // WorldServer interval is ~33ms. 1000 ticks = 33 seconds.
        // We can just call world.sim loop manually or use fake timers.
        // WorldServer uses setInterval.

        // Let's use fake timers to advance time
        const tickRate = 1000 / 30; // 33.33ms
        const ticksToRun = 1000;

        for (let i = 0; i < ticksToRun; i++) {
            jest.advanceTimersByTime(tickRate);
        }

        const snapshot = world.getSnapshot();
        const entities = snapshot.entities;

        // 1. Rat Population
        const rats = entities.filter(e => e.species === 'rat');
        const minRats = V1.densityTargets.rat.min;
        const maxRats = V1.capPerChunk.rat * 8 * 8; // Theoretical max much higher than density target

        // Assert we have at least min rats (ecosystem maintaier should have spawned them)
        // Note: Maintainer runs every 5 seconds (150 ticks).
        // 1000 ticks = 6+ cycles.
        expect(rats.length).toBeGreaterThanOrEqual(minRats);

        // 2. Resources Checks
        const objects = snapshot.objects || [];
        // Check Pond Water at (3,3)
        // Tile 3*32 = 96.
        const pondWater = objects.filter(o => o.type === 'water' && o.pos.tx >= 96 && o.pos.tx < 96 + 32 && o.pos.ty >= 96 && o.pos.ty < 96 + 32);
        expect(pondWater.length).toBeGreaterThanOrEqual(2);

        // 3. Cats exist (should spawn at edge if low)
        const cats = entities.filter(e => e.species === 'cat');
        expect(cats.length).toBeGreaterThanOrEqual(V1.densityTargets.cat.min);
    });
});
