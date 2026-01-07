
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { WorldServer } from './world/WorldServer';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

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

app.listen(PORT, () => {
    console.log(`🌍 World Server running on port ${PORT}`);
    console.log(`Tick Rate: ${30}Hz (approx)`);
});
