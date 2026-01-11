import { maintainEcosystem, getActiveZone, countEntitiesInZone } from '@sim/core/ecosystemMaintainer';
import { SimulationState } from '@sim/core/tick';
import { V1 } from '@shared/constants';
import { EntityRuntime, WorldObject } from '@shared/types';
import * as spawner from '@sim/core/spawner'; // Import as module to spy

describe('Ecosystem Maintainer', () => {
    let mockSim: SimulationState;
    let spawnSpy: jest.SpyInstance;

    beforeEach(() => {
        mockSim = {
            tick: 0,
            entities: new Map<string, EntityRuntime>(),
            objects: new Map<string, WorldObject>(),
            chunkManager: {
                activeChunks: new Set(),
                spawnObject: jest.fn(),
            } as any,
            rules: {
                capsEnabled: true,
            } as any,
            stats: {
                birthsThisMinute: 0,
                ecoStress: 0
            } as any,
            rng: () => 0.5,
            cameraCenter: { x: 2000, y: 2000 }, // Center of world
        } as unknown as SimulationState;

        // Spy on spawnEntity to verify calls
        spawnSpy = jest.spyOn(spawner, 'spawnEntity').mockReturnValue({ id: 'new-entity' } as any);

        // Mock console log to keep output clean
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should spawn rats when below minimum', () => {
        // Setup: 0 rats
        // Valid resource for rats to spawn near
        mockSim.objects.set('trash1', { type: 'trash', pos: { tx: 100, ty: 100 } } as any);

        // V1.densityTargets.rat.min is > 0 (e.g. 12 or 25 depending on consts)
        // With 0 rats, it should spawn some.

        maintainEcosystem(mockSim);

        expect(spawnSpy).toHaveBeenCalled();
        const callArgs = spawnSpy.mock.calls[0];
        expect(callArgs[1]).toBe('rat');
    });

    test('should NOT spawn rats when above minimum', () => {
        // Setup: enough rats
        const minRats = V1.densityTargets.rat.min;
        for (let i = 0; i < minRats + 5; i++) {
            // Place inside active zone
            const zone = getActiveZone(mockSim);
            mockSim.entities.set(`rat-${i}`, {
                id: `rat-${i}`,
                species: 'rat',
                state: 'idle',
                pos: { x: zone.centerX + 10, y: zone.centerY + 10 }
            } as any);
        }

        maintainEcosystem(mockSim);

        // Check filtering specifically for rat
        const ratCalls = spawnSpy.mock.calls.filter(args => args[1] === 'rat');
        expect(ratCalls.length).toBe(0);
    });

    test('should spawn cat at edge when below minimum', () => {
        // Setup: 0 cats
        // Cats spawn at edge "migration"

        maintainEcosystem(mockSim);

        // Check calls
        // might call rat spawn too if rats are low, so filter calls
        const catCalls = spawnSpy.mock.calls.filter(args => args[1] === 'cat');
        expect(catCalls.length).toBeGreaterThan(0);

        const lastCatCall = catCalls[0];
        const spawnReason = lastCatCall[5]?.spawnReason; // options is 6th arg
        expect(spawnReason).toBe('migration');
    });

    test('should regenerate resources', () => {
        // Setup: No resources
        // maintainResources checks specific coordinates in TILES
        // e.g. Pond (3,3) -> 3*32 tiles = 96 tiles

        maintainEcosystem(mockSim);

        expect(mockSim.chunkManager.spawnObject).toHaveBeenCalledWith(
            expect.anything(),
            'water',
            3 * 32, // 96
            3 * 32  // 96
        );
    });
});
