
import { ObjectType, SimEvent, SnapshotEntity, SimStats, WorldObject, SpeciesId } from '@shared/types';

// API Response Types
interface ServerSnapshot {
    tick: number;
    entities: SnapshotEntity[];
    objects: WorldObject[];
    stats: SimStats;
    events: SimEvent[];
}

interface ActionResponse {
    ok: boolean;
    entityId?: string;
    error?: string;
}

const SERVER_URL = import.meta.env.VITE_API_URL || '';
console.log('[ServerClient] Configured Server URL:', SERVER_URL || '(empty - using relative path)');

export class ServerClient {
    private static instance: ServerClient;

    // Latency Tracking
    public lastLatencyMs: number = 0;

    private constructor() { }

    public static getInstance(): ServerClient {
        if (!ServerClient.instance) {
            ServerClient.instance = new ServerClient();
        }
        return ServerClient.instance;
    }

    public async checkHealth(): Promise<boolean> {
        try {
            const start = Date.now();
            const res = await fetch(`${SERVER_URL}/health`);
            this.lastLatencyMs = Date.now() - start;
            if (res.ok) {
                const data = await res.json();
                return data.status === 'ok';
            }
            return false;
        } catch (e) {
            console.error('Connection Check Failed:', e);
            return false;
        }
    }

    public async getSnapshot(): Promise<ServerSnapshot | null> {
        try {
            const start = Date.now();
            // In a real optimized system we'd pass ?since=lastTick
            // For V1.3 MVP we poll the full state.
            const res = await fetch(`${SERVER_URL}/api/world/snapshot`);
            this.lastLatencyMs = Date.now() - start;

            if (res.ok) {
                const data = await res.json();
                // if (data && data.entities && data.entities.length > 0) {
                //     console.log(`[ServerClient] Fetched snapshot with ${data.entities.length} entities`);
                // }
                return data;
            }
            return null;
        } catch (e) {
            // console.error('Poll Failed:', e); // Optional: don't spam logs
            return null;
        }
    }

    public async getEntityDetail(id: string): Promise<any | null> {
        try {
            const res = await fetch(`${SERVER_URL}/api/world/entity/${id}`);
            if (res.ok) {
                return await res.json();
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    public async spawnAnimal(species: SpeciesId, x: number, y: number, name?: string): Promise<ActionResponse> {
        return this.postAction('/api/actions/spawn', { species, x, y, name });
    }

    public async placeObject(type: ObjectType, x: number, y: number): Promise<ActionResponse> {
        return this.postAction('/api/actions/place-object', { type, x, y });
    }

    public async resetWorld(): Promise<ActionResponse> {
        return this.postAction('/api/world/reset', {});
    }

    public async setRules(rules: any): Promise<ActionResponse> {
        return this.postAction('/api/world/rules', rules);
    }

    private async postAction(endpoint: string, payload: any): Promise<ActionResponse> {
        try {
            const res = await fetch(`${SERVER_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });


            if (!res.ok) {
                const text = await res.text();
                // Try to parse JSON error if possible
                try {
                    const json = JSON.parse(text);
                    return { ok: false, error: json.error || res.statusText };
                } catch {
                    // Fallback for non-JSON errors (e.g. 404 HTML)
                    console.error(`Action Failed [${endpoint}] Status ${res.status}:`, text.slice(0, 100)); // Log first 100 chars
                    return { ok: false, error: `Server Error ${res.status}` };
                }
            }

            return await res.json();
        } catch (e: any) {
            console.error(`Action Failed [${endpoint}]:`, e);
            return { ok: false, error: e.message || 'Network Error' };
        }
    }
}
