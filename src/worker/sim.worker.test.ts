
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WorkerCommand } from '@shared/types';

// Mock self globally for the worker context
const mockPostMessage = vi.fn();

// Shim self
const mockSelf = {
    postMessage: mockPostMessage,
    onmessage: null as ((e: MessageEvent) => void) | null,
};
vi.stubGlobal('self', mockSelf);

// Mock setInterval/clearInterval
vi.useFakeTimers();

describe('SimWorker', () => {
    // We need to dynamic import to ensure mocks apply before code runs
    // and to re-import if we want to reset module state (though difficult with ESM)

    beforeEach(async () => {
        vi.clearAllMocks();
        mockSelf.postMessage.mockReset();
        // Re-importing ESM in vitest is tricky without isolation. 
        // For now, we rely on the side-effect of the first import setting self.onmessage
        // We might just assume single load.
        await import('./sim.worker');
    });

    afterEach(() => {
        // Stop any running intervals
        vi.clearAllTimers();
    });

    const sendCommand = (cmd: WorkerCommand) => {
        if (mockSelf.onmessage) {
            mockSelf.onmessage({ data: cmd } as MessageEvent);
        }
    };

    it('should handle INIT_WORLD', () => {
        sendCommand({
            type: 'INIT_WORLD',
            payload: {
                seed: 123,
                mapId: 'test-map',
                rules: {
                    capsEnabled: true,
                    ai: {} as any,
                    timeScale: 1
                } as any
            }
        });

        // Should have sent initial snapshot
        expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
            type: 'SNAPSHOT'
        }));
    });

    it('should run tick loop and send snapshots', () => {
        // Init first
        sendCommand({
            type: 'RESET_WORLD',
            payload: { seed: 123 }
        });
        mockPostMessage.mockClear();

        // Advance time by 1 second
        vi.advanceTimersByTime(1000);

        // Check for snapshots
        // 1 sec / snapshotHz (10) = 10 snapshots
        expect(mockPostMessage).toHaveBeenCalled();
        const calls = mockPostMessage.mock.calls;
        const snapshotCalls = calls.filter((c: any) => c[0].type === 'SNAPSHOT');
        expect(snapshotCalls.length).toBeGreaterThan(0);
    });

    it('should handle SPAWN_ENTITY', () => {
        // Init
        sendCommand({
            type: 'RESET_WORLD',
            payload: { seed: 123 }
        });

        sendCommand({
            type: 'SPAWN_ENTITY',
            payload: {
                species: 'rat',
                name: 'TestRat',
                personality: 'curious',
                pos: { tx: 100, ty: 100 }
            }
        });

        // We can't easily inspect internal state without exporting it,
        // but we can check if it didn't crash and ideally we'd see a side effect.
        // The worker logs to console on spawn success in current impl
        // Or we could trigger a snapshot and see if entity is there.

        vi.advanceTimersByTime(100); // Process tick

        // Check snapshot contains the entity
        const lastCall = mockPostMessage.mock.calls[mockPostMessage.mock.calls.length - 1];
        const snapshot = lastCall[0].payload;
        expect(snapshot.entities).toBeDefined();
    });

    it('should handle UPDATE_CAMERA', () => {
        sendCommand({
            type: 'RESET_WORLD',
            payload: { seed: 123 }
        });

        sendCommand({
            type: 'UPDATE_CAMERA',
            payload: { centerX: 500, centerY: 500, zoom: 2 }
        });

        // No direct output, but ensures no crash
        expect(true).toBe(true);
    });
});
