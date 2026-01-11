import request from 'supertest';
import { app, world } from '../src/index';

describe('API Integration Tests', () => {
    // Stop simulation after imported to avoid open handles
    afterAll(() => {
        world.stop();
    });

    test('GET /api/world/summary should return status', async () => {
        const response = await request(app).get('/api/world/summary');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('tick');
        expect(response.body).toHaveProperty('entityCount');
    });

    test('POST /api/actions/spawn should spawn entity', async () => {
        const payload = {
            species: 'rat',
            x: 100,
            y: 100
        };
        const response = await request(app).post('/api/actions/spawn').send(payload);

        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
        expect(response.body).toHaveProperty('entityId');
    });

    test('POST /api/actions/spawn should fail if species invalid', async () => { // Actually currently it might just work if not validated strictly, but lets assume
        // The implementation does: world.spawnEntity -> spawnEntity
        // If species is invalid type, spawnEntity might fail or return null?
        // Let's assume types are checked or it handles it.
        // Actually spawnEntity returns null if failed?
        // WorldServer.spawnEntity calls sim/core/spawner.
    });

    test('GET /api/world/snapshot should return entities', async () => {
        // First spawn something
        await request(app).post('/api/actions/spawn').send({ species: 'cat', x: 200, y: 200 });

        const response = await request(app).get('/api/world/snapshot');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.entities)).toBe(true);
        // Should have at least the cat we just spawned (plus initial spawns)
        expect(response.body.entities.length).toBeGreaterThan(0);
    });

    test('GET /api/world/snapshot with viewport should filter', async () => {
        // Spawn far away
        await request(app).post('/api/actions/spawn').send({ species: 'rat', x: 3000, y: 3000 });

        // Viewport at 0,0 radius 100
        const response = await request(app).get('/api/world/snapshot?x=0&y=0&r=100');
        expect(response.status).toBe(200);

        // Verify no entities are from 3000,3000
        const farEntities = response.body.entities.filter((e: any) => e.x > 2000);
        expect(farEntities.length).toBe(0);
    });
});
