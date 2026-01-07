
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpawnPanel } from '@app/panels/SpawnPanel';
import { V1 } from '@shared/constants';

// Mock the store
const mockSetSpawnSpecies = vi.fn();
const mockSetSpawnPersonality = vi.fn();
const mockSetCurrentTool = vi.fn();
const mockPostMessage = vi.fn();

vi.mock('../store/gameStore', () => ({
    useGameStore: () => ({
        spawnSpecies: 'rat',
        setSpawnSpecies: mockSetSpawnSpecies,
        spawnPersonality: 'curious',
        setSpawnPersonality: mockSetSpawnPersonality,
        currentTool: 'none',
        setCurrentTool: mockSetCurrentTool,
        stats: { rat: 5, cat: 1 }
    }),
    getSimWorker: () => ({
        postMessage: mockPostMessage
    })
}));

describe('SpawnPanel', () => {
    it('should render species buttons', () => {
        render(<SpawnPanel />);
        expect(screen.getByText('鼠')).toBeInTheDocument();
        expect(screen.getByText('猫')).toBeInTheDocument();
    });

    it('should show correct counts', () => {
        render(<SpawnPanel />);
        const ratCap = V1.densityTargets.rat.max;
        expect(screen.getByText(`5/${ratCap}`)).toBeInTheDocument();
    });

    it('should switch species on click', () => {
        render(<SpawnPanel />);
        const catBtn = screen.getByText('猫');
        fireEvent.click(catBtn);
        expect(mockSetSpawnSpecies).toHaveBeenCalledWith('cat');
    });

    it('should trigger quick spawn', () => {
        render(<SpawnPanel />);
        const spawnBtn = screen.getByText('✨ 快速投放');
        fireEvent.click(spawnBtn);

        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
            type: 'SPAWN_ENTITY',
            payload: expect.objectContaining({
                species: 'rat'
            })
        }));
    });
});
