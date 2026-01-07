
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveGame, loadGame, listSaves, deleteSave } from './save';
import type { WorldSaveData } from '@shared/types';

// Mock idb
const mockDb = {
    put: vi.fn(),
    getAll: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    close: vi.fn(),
};

vi.mock('idb', () => ({
    openDB: vi.fn(() => Promise.resolve(mockDb))
}));

describe('Save System', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createMockSave = (id: string): WorldSaveData => ({
        schemaVersion: 1,
        meta: {
            saveId: id,
            name: 'Test Save',
            createdAtIso: '2025-01-01',
            updatedAtIso: '2025-01-01',
            playTicks: 100
        },
        world: {
            seed: 123,
            mapId: 'test',
            tick: 100,
            rules: {} as any
        },
        objects: [],
        entities: [],
        graveyard: []
    } as any);

    it('should save game', async () => {
        const save = createMockSave('save1');
        await saveGame('save1', 'Test Save', save);
        expect(mockDb.put).toHaveBeenCalledWith('saves', expect.objectContaining({
            id: 'save1',
            name: 'Test Save',
            data: save
        }));
    });

    it('should list saves', async () => {
        const entry1 = { id: 's1', name: 'Save 1', updatedAt: 200, data: {} };
        const entry2 = { id: 's2', name: 'Save 2', updatedAt: 100, data: {} };

        mockDb.getAll.mockResolvedValue([entry1, entry2]);

        const result = await listSaves();
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('s1');
    });

    it('should load game', async () => {
        const save = createMockSave('save1');
        mockDb.get.mockResolvedValue({ data: save });

        const result = await loadGame('save1');
        expect(result).toEqual(save);
    });

    it('should delete save', async () => {
        await deleteSave('save1');
        expect(mockDb.delete).toHaveBeenCalledWith('saves', 'save1');
    });
});
