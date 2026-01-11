import { canSpawn } from '@sim/core/spawner';
import { SimulationState } from '@sim/core/tick';
import { V1 } from '@shared/constants';
import { SpeciesId, EntityRuntime } from '@shared/types';

describe('Spawner Logic', () => {
    let mockSim: SimulationState;

    beforeEach(() => {
        // Mock a minimal SimulationState
        mockSim = {
            tick: 0,
            entities: new Map<string, EntityRuntime>(),
            objects: new Map(),
            chunkManager: {
                activeChunks: new Set(),
                // Mock other needed methods if any
            } as any,
            rules: {
                capsEnabled: true,
            } as any,
            stats: {
                birthsThisMinute: 0,
            } as any,
            rng: () => 0.5,
            cameraCenter: { x: 0, y: 0 },
        } as unknown as SimulationState;
    });

    test('canSpawn should allow spawning in empty chunk', () => {
        const can = canSpawn('rat', mockSim, { tx: 0, ty: 0 });
        expect(can).toBe(true);
    });

    test('canSpawn should block when chunk cap is reached', () => {
        const species: SpeciesId = 'rat';
        const chunkCap = V1.capPerChunk[species];
        const cx = 0, cy = 0;

        // Fill the chunk
        for (let i = 0; i < chunkCap; i++) {
            const entity: EntityRuntime = {
                id: `rat-${i}`,
                species: 'rat',
                state: 'idle',
                pos: { x: (cx * V1.chunkSize + 1) * V1.tileSizePx, y: (cy * V1.chunkSize + 1) * V1.tileSizePx },
            } as any;
            mockSim.entities.set(entity.id, entity);
        }

        // Try to spawn one more in same chunk
        const can = canSpawn('rat', mockSim, { tx: cx * V1.chunkSize + 5, ty: cy * V1.chunkSize + 5 });
        expect(can).toBe(false);
    });

    test('canSpawn should allow spawning in different chunk even if first is full', () => {
        const species: SpeciesId = 'rat';
        const chunkCap = V1.capPerChunk[species];
        const cx = 0, cy = 0;

        // Fill chunk 0,0
        for (let i = 0; i < chunkCap; i++) {
            const entity: EntityRuntime = {
                id: `rat-${i}`,
                species: 'rat',
                state: 'idle',
                pos: { x: 10, y: 10 },
            } as any;
            mockSim.entities.set(entity.id, entity);
        }

        // Try to spawn in chunk 1,1
        const otherChunkTx = (cx + 1) * V1.chunkSize + 5;
        const otherChunkTy = (cy + 1) * V1.chunkSize + 5;

        const can = canSpawn('rat', mockSim, { tx: otherChunkTx, ty: otherChunkTy });
        expect(can).toBe(true);
    });

    test('canSpawn (manual) should check global limit if no pos provided', () => {
        // Mock active chunks size = 1
        (mockSim.chunkManager.activeChunks as Set<string>).add('0,0');

        const species: SpeciesId = 'rat';
        const cap = V1.capPerChunk[species]; // 1 chunk * cap

        // Fill it
        for (let i = 0; i < cap; i++) {
            mockSim.entities.set(`e-${i}`, { species: 'rat', state: 'idle' } as any);
        }

        const can = canSpawn('rat', mockSim); // No pos
        expect(can).toBe(false);
    });
});
