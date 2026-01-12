
import { createSimulation, simulateTick, getSnapshot, SimulationState } from '../sim/core/tick';
import { DEFAULT_WORLD_RULES, SpeciesId, WorldSaveData, WorldObject, ObjectType, EntityRuntime } from '../shared/types';
import { spawnEntity } from '../sim/core/spawner';
import { V1 } from '../shared/constants';
import { EntityService } from '../services/EntityService';
import { EventService } from '../services/EventService';
import { SnapshotService } from '../services/SnapshotService';
import { isFirebaseInitialized } from '../config/firebaseConfig';

export class WorldServer {
    private sim!: SimulationState;
    private intervalId: NodeJS.Timeout | null = null;
    private autoSaveIntervalId: NodeJS.Timeout | null = null;
    private readonly TICK_RATE_MS = 1000 / 30; // 30 Hz
    private readonly AUTO_SAVE_INTERVAL_MS = 60000; // Auto-save every 60 seconds
    private lastAutoSaveTick = 0;
    private isRestoring = false;

    constructor() {
        // Initialize with fresh simulation first
        this.sim = createSimulation(Date.now(), 'server_world_v1', DEFAULT_WORLD_RULES);
        this.sim.chunkManager.initializeWorld(this.sim);

        // Async restore from latest snapshot (non-blocking)
        this.tryRestoreFromSnapshot().catch(console.error);
    }

    /**
     * Try to restore simulation state from the latest GCS snapshot
     */
    private async tryRestoreFromSnapshot(): Promise<void> {
        if (!isFirebaseInitialized()) {
            console.log('📦 Firebase not configured, starting fresh simulation');
            return;
        }

        try {
            this.isRestoring = true;
            console.log('🔄 Attempting to restore from latest snapshot...');

            const snapshot = await SnapshotService.loadLatestSnapshot();
            if (snapshot && snapshot.entities && snapshot.entities.length > 0) {
                // Restore entities from snapshot
                this.sim.entities.clear();
                for (const entityData of snapshot.entities) {
                    const entity = this.entityDataToRuntime(entityData);
                    if (entity) {
                        this.sim.entities.set(entity.id, entity);
                    }
                }

                // Restore objects from snapshot
                if (snapshot.objects) {
                    this.sim.objects.clear();
                    for (const obj of snapshot.objects) {
                        this.sim.objects.set(obj.id, obj);
                    }
                }

                // Update tick
                this.sim.tick = snapshot.tick || 0;
                this.lastAutoSaveTick = this.sim.tick;

                // Restore graveyard from snapshot
                if (snapshot.graveyard) {
                    this.sim.graveyard = snapshot.graveyard;
                }

                // Restore rules if present (V1.3 Persistence)
                if (snapshot.rules) {
                    this.sim.rules = snapshot.rules;
                    console.log(`✅ Restored rules. TimeScale: ${this.sim.rules.timeScale}`);
                }

                console.log(`✅ Restored from snapshot: tick ${snapshot.tick}, ${snapshot.entities.length} entities, ${snapshot.objects?.length || 0} objects, ${snapshot.graveyard?.length || 0} graveyard`);
            } else {
                console.log('📦 No snapshot found, starting fresh simulation');
            }
        } catch (error: any) {
            console.warn('⚠️ Could not restore from snapshot:', error.message);
            console.log('📦 Starting fresh simulation');
        } finally {
            this.isRestoring = false;
        }
    }

    /**
     * Convert snapshot entity data back to EntityRuntime
     */
    private entityDataToRuntime(data: any): EntityRuntime | null {
        try {
            return {
                id: data.id,
                species: data.species,
                name: data.name || 'Unknown',
                personality: data.personality || 'curious',
                sex: data.sex || (Math.random() > 0.5 ? 'male' : 'female'), // Restore or assign random
                pos: { x: data.x || data.pos?.x || 0, y: data.y || data.pos?.y || 0 },
                vel: { x: 0, y: 0 },
                facing: data.facing || 'e',
                vitals: data.vitals || { hunger01: 0.5, thirst01: 0.5, fatigue01: 0.2, health01: 1 },
                ageTicks: data.ageTicks || 0,
                state: data.state || 'idle',
                generation: data.generation || 1,
                parents: data.parents || [],
                children: data.children || [],
                history: [],
                path: [],
                ai: {
                    lastPerceptionTick: 0,
                    lastDecisionTick: 0,
                    currentGoal: 'wander',
                    lastUtilityScores: {},
                    recentStimuli: [],
                },
            };
        } catch (e) {
            console.warn('Failed to convert entity data:', e);
            return null;
        }
    }

    public start() {
        if (this.intervalId) return;

        console.log('🚀 Starting Simulation Loop...');

        // Main tick loop
        this.intervalId = setInterval(() => {
            if (this.isRestoring) return; // Skip ticks while restoring

            try {
                simulateTick(this.sim);

                // Check for deaths and log to graveyard
                this.processDeaths();
            } catch (e) {
                console.error('CRASH IN TICK:', e);
            }
        }, this.TICK_RATE_MS);

        // Auto-save loop
        this.autoSaveIntervalId = setInterval(() => {
            this.autoSave().catch(console.error);
        }, this.AUTO_SAVE_INTERVAL_MS);

        console.log(`⏱️ Auto-save enabled: every ${this.AUTO_SAVE_INTERVAL_MS / 1000} seconds`);
    }

    /**
     * Process entity deaths and log to graveyard
     */
    private processDeaths() {
        // Check for dead entities (marked with dead property)
        for (const [id, entity] of this.sim.entities) {
            if (entity.dead && entity.state === 'dead') {
                // Log to graveyard in Firestore
                EventService.logToGraveyard(entity, entity.dead.reason).catch(console.error);

                // Remove from Firestore entities collection
                EntityService.deleteEntity(id).catch(console.error);
            }
        }
    }

    /**
     * Auto-save snapshot to GCS
     */
    private async autoSave(): Promise<void> {
        if (!isFirebaseInitialized()) return;
        if (this.isRestoring) return;

        // Only save if there have been changes
        if (this.sim.tick === this.lastAutoSaveTick) {
            return;
        }

        try {
            const snapshot = this.getSnapshot();
            const worldData = {
                schemaVersion: 1 as const,
                tick: this.sim.tick,
                seed: Date.now(),
                entities: snapshot.entities,
                objects: snapshot.objects || [],
                chunks: {},
                graveyard: this.sim.graveyard, // Persist graveyard
                rules: this.sim.rules, // Persist rules
            };

            await SnapshotService.saveSnapshot(worldData);
            this.lastAutoSaveTick = this.sim.tick;

            console.log(`💾 Auto-saved at tick ${this.sim.tick}`);
        } catch (error: any) {
            console.error('Auto-save failed:', error.message);
        }
    }

    public stop() {
        // Save before stopping
        this.autoSave().catch(console.error);

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        if (this.autoSaveIntervalId) {
            clearInterval(this.autoSaveIntervalId);
            this.autoSaveIntervalId = null;
        }

        console.log('🛑 Simulation stopped');
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

    public spawnEntity(species: SpeciesId, x: number, y: number, name?: string) {
        // Use V1 constant for tile size instead of hardcoded 32
        const spawnPos = { tx: Math.floor(x / V1.tileSizePx), ty: Math.floor(y / V1.tileSizePx) };
        console.log(`[Spawn] Request: ${species} at ${x},${y} -> Tile ${spawnPos.tx},${spawnPos.ty}`);
        const nameToUse = name || 'Player Spawned';
        const newEntity = spawnEntity(this.sim, species, nameToUse, 'curious', spawnPos);

        if (newEntity) {
            console.log(`[Spawn] Success: ${newEntity.name} (${newEntity.species}) at tile ${spawnPos.tx},${spawnPos.ty}`);

            // Persist to Firestore (async, don't block)
            EntityService.saveEntity(newEntity).catch(console.error);

            return { success: true, entityId: newEntity.id };
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

    public placeObject(type: ObjectType, x: number, y: number) {
        const tilePos = { tx: Math.floor(x / V1.tileSizePx), ty: Math.floor(y / V1.tileSizePx) };
        const objId = Math.random().toString(36).substring(7);

        const object: WorldObject = {
            id: objId,
            type,
            pos: tilePos,
            data: { resources: 100, maxResources: 100, regenRate: 1.0 }
        };

        this.sim.objects.set(objId, object);
        console.log(`[Place] Object: ${type} at tile ${tilePos.tx},${tilePos.ty}`);

        // Note: Objects are persisted via auto-save snapshots, not individually
        return { success: true, objectId: objId };
    }

    /**
     * Force save current state (can be called via API)
     */
    public async forceSave(): Promise<{ success: boolean; path?: string; error?: string }> {
        try {
            const snapshot = this.getSnapshot();
            const worldData = {
                schemaVersion: 1 as const,
                tick: this.sim.tick,
                seed: Date.now(),
                entities: snapshot.entities,
                objects: snapshot.objects || [],
                chunks: {},
                graveyard: this.sim.graveyard, // Persist graveyard
                rules: this.sim.rules, // Persist rules
            };

            const path = await SnapshotService.saveSnapshot(worldData);
            this.lastAutoSaveTick = this.sim.tick;
            return { success: true, path };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
    /**
     * Reset the world to initial state (Shift+A)
     */
    public async reset(): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('🔄 RESETTING WORLD...');

            // 1. Stop loop temporarily
            const wasRunning = !!this.intervalId;
            if (wasRunning) this.stop();

            // 2. Clear Simulation State
            this.sim.entities.clear();
            this.sim.objects.clear();
            this.sim.tick = 0;
            this.sim.graveyard = []; // Clear graveyard on reset
            this.lastAutoSaveTick = -1;

            // 3. Re-initialize World (Spawns & Resources)
            // We use a new seed to get fresh random positions
            this.sim.rng = require('seedrandom')(Date.now().toString());
            this.sim.chunkManager.initializeWorld(this.sim, true);

            console.log('✅ World state cleared and re-initialized');

            // 4. Persistence Reset (Snapshot & Entities)
            await EntityService.clearAllEntities(); // Clear Firestore collection
            // Overwrite the "latest" snapshot with this fresh state
            const saveResult = await this.forceSave();

            // 5. Restart Loop
            if (wasRunning) {
                this.start();
            }

            return { success: true };
        } catch (error: any) {
            console.error('Reset failed:', error);
            return { success: false, error: error.message };
        }
    }
    public updateRules(rules: Partial<typeof DEFAULT_WORLD_RULES>) {
        this.sim.rules = { ...this.sim.rules, ...rules };
        console.log(`[Rules] Updated:`, rules);
    }

    public getRules() {
        return this.sim.rules;
    }
}
