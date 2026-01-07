
import { createSimulation, simulateTick, getSnapshot, SimulationState } from '../sim/core/tick';
import { DEFAULT_WORLD_RULES, SpeciesId, WorldSaveData } from '../shared/types';
import { spawnEntity } from '../sim/core/spawner';

export class WorldServer {
    private sim: SimulationState;
    private intervalId: NodeJS.Timeout | null = null;
    private readonly TICK_RATE_MS = 1000 / 30; // 30 Hz

    constructor() {
        // Initialize simulation with default seed
        this.sim = createSimulation(Date.now(), 'server_world_v1', DEFAULT_WORLD_RULES);
    }

    public start() {
        if (this.intervalId) return;

        console.log('🚀 Starting Simulation Loop...');
        this.intervalId = setInterval(() => {
            try {
                simulateTick(this.sim);
            } catch (e) {
                console.error('CRASH IN TICK:', e);
            }
        }, this.TICK_RATE_MS);
    }

    public stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    public getTick(): number {
        return this.sim.tick;
    }

    public getSummary() {
        return {
            tick: this.sim.tick,
            stats: this.sim.stats,
            entityCount: this.sim.entities.size
        };
    }

    public getSnapshot() {
        // For MVP: Return full snapshot
        return getSnapshot(this.sim);
    }

    public spawnEntity(species: SpeciesId, x: number, y: number) {
        // Simple direct spawn for now
        const spawnPos = { tx: Math.floor(x / 32), ty: Math.floor(y / 32) }; // Assuming 32px tiles
        console.log(`[Spawn] Request: ${species} at ${x},${y} -> Tile ${spawnPos.tx},${spawnPos.ty}`);
        const id = spawnEntity(this.sim, species, 'Player Spawned', 'curious', spawnPos);

        if (id) {
            console.log(`[Spawn] Success: ${id.id}`);
            return { success: true, entityId: id.id };
        }
        console.warn('[Spawn] Failed');
        return { success: false, error: 'Spawn failed' };
    }

    public getEntityDetail(id: string) {
        const entity = this.sim.entities.get(id);
        if (!entity) return null;

        // Return full entity runtime (simulated server has full state)
        // Ensure strictly matches EntityRuntime from types.ts
        return {
            id: entity.id,
            species: entity.species,
            name: entity.name,
            personality: entity.personality,
            pos: entity.pos, // Vec2 (pixels)
            vel: entity.vel,
            facing: entity.facing,
            vitals: entity.vitals,
            ageTicks: entity.ageTicks,
            state: entity.state,
            targetEntityId: entity.targetEntityId,
            targetObjectId: entity.targetObjectId,
            targetPos: entity.targetPos,
            ai: entity.ai,
            parents: entity.parents,
            children: entity.children,
            generation: entity.generation,
            history: entity.history,
            path: entity.path,
        };
    }
}
