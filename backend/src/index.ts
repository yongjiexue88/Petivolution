
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { WorldServer } from './world/WorldServer';
import { initializeFirebase } from './config/firebaseConfig';
import { PlayerService } from './services/PlayerService';
import { WorldService } from './services/WorldService';
import { ChunkService } from './services/ChunkService';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Initialize Firebase on startup
try {
    initializeFirebase();
    console.log('✅ Firebase initialized successfully');
} catch (error: any) {
    console.warn('⚠️  Firebase not initialized:', error.message);
    console.warn('⚠️  Firestore endpoints will not be available');
}

// Singleton World Server
const world = new WorldServer();

// Start Simulation
world.start();

// API: Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', tick: world.getTick() });
});

// API: World Summary
app.get('/api/world/summary', (req, res) => {
    // TODO: Return proper summary
    res.json(world.getSummary());
});

// API: Snapshot (Polling)
app.get('/api/world/snapshot', (req, res) => {
    // TODO: Parse query params for viewport/radius
    const snapshot = world.getSnapshot();
    res.json(snapshot);
});

// API: Actions (Spawn)
app.post('/api/actions/spawn', (req, res) => {
    const { species, x, y } = req.body;
    // TODO: Validate GP, Quota
    const result = world.spawnEntity(species, x, y);
    if (result.success) {
        res.json({ ok: true, entityId: result.entityId });
    } else {
        res.status(400).json({ ok: false, error: result.error });
    }
});

// API: Actions (Place Object)
app.post('/api/actions/place-object', (req, res) => {
    const { type, x, y } = req.body;
    const result = world.placeObject(type, x, y);
    if (result.success) {
        res.json({ ok: true, objectId: result.objectId });
    } else {
        res.status(400).json({ ok: false, error: 'Failed to place object' });
    }
});

// API: Entity Detail (Selection)
app.get('/api/world/entity/:id', (req, res) => {
    const detail = world.getEntityDetail(req.params.id);
    if (detail) {
        res.json(detail);
    } else {
        res.status(404).json({ error: 'Entity not found' });
    }
});

// ============================================
// Firestore API Endpoints
// ============================================

// Player Endpoints
app.get('/api/player/:playerId', async (req, res) => {
    try {
        const player = await PlayerService.getPlayer(req.params.playerId);
        if (player) {
            res.json(player);
        } else {
            res.status(404).json({ error: 'Player not found' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/player', async (req, res) => {
    try {
        const { playerId, name } = req.body;
        if (!playerId || !name) {
            return res.status(400).json({ error: 'playerId and name are required' });
        }
        const player = await PlayerService.createPlayer(playerId, name);
        res.status(201).json(player);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/player/:playerId/gp', async (req, res) => {
    try {
        const { delta } = req.body;
        if (typeof delta !== 'number') {
            return res.status(400).json({ error: 'delta must be a number' });
        }
        await PlayerService.updateGP(req.params.playerId, delta);
        res.json({ ok: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/player/:playerId/pin', async (req, res) => {
    try {
        const { worldId } = req.body;
        if (!worldId) {
            return res.status(400).json({ error: 'worldId is required' });
        }
        await PlayerService.addPin(req.params.playerId, worldId);
        res.json({ ok: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/player/:playerId/pin/:worldId', async (req, res) => {
    try {
        await PlayerService.removePin(req.params.playerId, req.params.worldId);
        res.json({ ok: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/player/:playerId/rate-limit/:action', async (req, res) => {
    try {
        const action = req.params.action as 'spawn' | 'place';
        if (action !== 'spawn' && action !== 'place') {
            return res.status(400).json({ error: 'action must be spawn or place' });
        }
        const result = await PlayerService.checkRateLimit(req.params.playerId, action);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// World Metadata Endpoints
app.get('/api/world/metadata', async (req, res) => {
    try {
        const metadata = await WorldService.getWorldMetadata();
        if (metadata) {
            res.json(metadata);
        } else {
            res.status(404).json({ error: 'World metadata not found' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/world/metadata', async (req, res) => {
    try {
        const { seed } = req.body;
        const metadata = await WorldService.initializeWorld(seed);
        res.status(201).json(metadata);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/world/metadata', async (req, res) => {
    try {
        const updates = req.body;
        await WorldService.updateWorldMetadata(updates);
        res.json({ ok: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Chunk Endpoints
app.get('/api/chunks/:cx/:cy', async (req, res) => {
    try {
        const cx = parseInt(req.params.cx, 10);
        const cy = parseInt(req.params.cy, 10);

        if (isNaN(cx) || isNaN(cy)) {
            return res.status(400).json({ error: 'Invalid chunk coordinates' });
        }

        const chunk = await ChunkService.getChunk(cx, cy);
        if (chunk) {
            res.json(chunk);
        } else {
            res.status(404).json({ error: 'Chunk not found' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/chunks/:cx/:cy', async (req, res) => {
    try {
        const cx = parseInt(req.params.cx, 10);
        const cy = parseInt(req.params.cy, 10);

        if (isNaN(cx) || isNaN(cy)) {
            return res.status(400).json({ error: 'Invalid chunk coordinates' });
        }

        const { stats } = req.body;
        if (!stats) {
            return res.status(400).json({ error: 'stats object is required' });
        }

        await ChunkService.updateChunkStats(cx, cy, stats);
        res.json({ ok: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chunks/batch', async (req, res) => {
    try {
        const { updates } = req.body;
        if (!Array.isArray(updates)) {
            return res.status(400).json({ error: 'updates must be an array' });
        }

        await ChunkService.batchUpdateChunks(updates);
        res.json({ ok: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chunks/:cx/:cy/objects', async (req, res) => {
    try {
        const cx = parseInt(req.params.cx, 10);
        const cy = parseInt(req.params.cy, 10);

        if (isNaN(cx) || isNaN(cy)) {
            return res.status(400).json({ error: 'Invalid chunk coordinates' });
        }

        const { object } = req.body;
        if (!object) {
            return res.status(400).json({ error: 'object is required' });
        }

        await ChunkService.addStaticObject(cx, cy, object);
        res.json({ ok: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/chunks/:cx/:cy/objects/:objectId', async (req, res) => {
    try {
        const cx = parseInt(req.params.cx, 10);
        const cy = parseInt(req.params.cy, 10);

        if (isNaN(cx) || isNaN(cy)) {
            return res.status(400).json({ error: 'Invalid chunk coordinates' });
        }

        await ChunkService.removeStaticObject(cx, cy, req.params.objectId);
        res.json({ ok: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Cloud Storage + SSE Endpoints
// ============================================

import { initializeStorage } from './config/storageConfig';
import { SnapshotService } from './services/SnapshotService';
import { getSSEManager } from './services/SSEManager';
import { v4 as uuidv4 } from 'uuid';

// Initialize Cloud Storage
try {
    initializeStorage();
    console.log('✅ Cloud Storage initialized successfully');
} catch (error: any) {
    console.warn('⚠️  Cloud Storage not initialized:', error.message);
}

// Get SSE Manager instance
const sseManager = getSSEManager();

// SSE Event Stream
app.get('/api/events', (req, res) => {
    const clientId = uuidv4();
    const playerId = req.query.playerId as string | undefined;

    sseManager.addClient(clientId, res, playerId);

    // Update viewport if provided
    const x = req.query.x ? parseFloat(req.query.x as string) : undefined;
    const y = req.query.y ? parseFloat(req.query.y as string) : undefined;
    const r = req.query.r ? parseFloat(req.query.r as string) : undefined;

    if (x !== undefined && y !== undefined && r !== undefined) {
        sseManager.updateClientViewport(clientId, x, y, r);
    }
});

// Viewport-based Snapshot
app.get('/api/world/snapshot', (req, res) => {
    try {
        const x = req.query.x ? parseFloat(req.query.x as string) : undefined;
        const y = req.query.y ? parseFloat(req.query.y as string) : undefined;
        const r = req.query.r ? parseFloat(req.query.r as string) : 50;

        const snapshot = world.getSnapshot();

        // Filter entities by viewport if provided
        if (x !== undefined && y !== undefined) {
            const filteredEntities = snapshot.entities.filter((entity: any) => {
                const dx = entity.x - x;
                const dy = entity.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance <= r;
            });

            snapshot.entities = filteredEntities;
        }

        res.json(snapshot);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Save Snapshot to GCS
app.post('/api/world/snapshot', async (req, res) => {
    try {
        const snapshot = world.getSnapshot();
        // Convert snapshot to WorldSnapshot format
        const worldData = {
            schemaVersion: 1 as const,
            tick: world.getTick(),
            seed: 12345, // TODO: Get from world
            entities: snapshot.entities,
            objects: snapshot.objects || [],
            chunks: {},
            graveyard: [],
        };
        const gsPath = await SnapshotService.saveSnapshot(worldData);
        res.json({ ok: true, path: gsPath, tick: worldData.tick });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Load Snapshot from GCS
app.get('/api/world/snapshot/:tick', async (req, res) => {
    try {
        const tick = parseInt(req.params.tick, 10);
        if (isNaN(tick)) {
            return res.status(400).json({ error: 'Invalid tick parameter' });
        }

        const snapshot = await SnapshotService.loadSnapshot(tick);
        res.json(snapshot);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// List Snapshots
app.get('/api/world/snapshots', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
        const snapshots = await SnapshotService.listSnapshots(limit);
        res.json(snapshots);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// SSE Status
app.get('/api/events/status', (req, res) => {
    res.json({
        connectedClients: sseManager.getClientCount(),
        clients: sseManager.getClientInfo(),
    });
});

const server = app.listen(PORT, () => {
    console.log(`🌍 World Server running on port ${PORT}`);
    console.log(`Tick Rate: ${30}Hz (approx)`);
});

// Graceful shutdown for Cloud Run
// Cloud Run sends SIGTERM when stopping a container
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');

    // Stop the world simulation tick loop
    world.stop();

    // Close the HTTP server
    server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
    });

    // Force shutdown after 30 seconds if graceful shutdown fails
    setTimeout(() => {
        console.error('⚠️ Forced shutdown after timeout');
        process.exit(1);
    }, 30000);
});

