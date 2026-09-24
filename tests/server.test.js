const request = require('supertest');
const { app, devicesDb } = require('./server');

describe('Mini Device Fleet Monitor API', () => {
    beforeEach(() => {
        // Clear DB before each test
        devicesDb.clear();
        jest.useRealTimers();
    });

    test('should register a new device', async () => {
        const res = await request(app)
            .post('/devices')
            .send({ id: 'dev-1', name: 'Test Device 1' });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.id).toBe('dev-1');
        expect(res.body.status).toBe('OFFLINE'); // Initially offline
    });

    test('should reject duplicate device registration', async () => {
        await request(app).post('/devices').send({ id: 'dev-1', name: 'Test Device 1' });
        const res = await request(app).post('/devices').send({ id: 'dev-1', name: 'Duplicate' });
        
        expect(res.statusCode).toBe(400);
    });

    test('should process heartbeat and mark device ONLINE', async () => {
        await request(app).post('/devices').send({ id: 'dev-1', name: 'Test Device 1' });
        
        const resHeartbeat = await request(app)
            .post('/devices/dev-1/heartbeat')
            .send({ timestamp: new Date().toISOString(), status: 'OK' });
            
        expect(resHeartbeat.statusCode).toBe(202);

        const resDevice = await request(app).get('/devices/dev-1');
        expect(resDevice.body.status).toBe('ONLINE');
    });

    test('30-second timeout rule correctly transitions device to OFFLINE', async () => {
        // Enable fake timers to time travel
        jest.useFakeTimers();
        const baseTime = new Date('2026-09-21T10:30:00Z');
        jest.setSystemTime(baseTime);

        // Register & Send Heartbeat at Base Time
        await request(app).post('/devices').send({ id: 'timeout-dev', name: 'Timeout Device' });
        await request(app)
            .post('/devices/timeout-dev/heartbeat')
            .send({ timestamp: baseTime.toISOString(), status: 'OK' });

        // Advance time by 29 seconds -> Should still be ONLINE
        jest.setSystemTime(new Date(baseTime.getTime() + 29000));
        let res = await request(app).get('/devices/timeout-dev');
        expect(res.body.status).toBe('ONLINE');

        // Advance time by 2 more seconds (31s total) -> Should be OFFLINE
        jest.setSystemTime(new Date(baseTime.getTime() + 31000));
        res = await request(app).get('/devices/timeout-dev');
        expect(res.body.status).toBe('OFFLINE');
    });

    test('fleet summary correctly counts online/offline devices', async () => {
        await request(app).post('/devices').send({ id: 'dev-A', name: 'Device A' });
        await request(app).post('/devices').send({ id: 'dev-B', name: 'Device B' });

        // Only send heartbeat for Dev A
        await request(app)
            .post('/devices/dev-A/heartbeat')
            .send({ timestamp: new Date().toISOString(), status: 'OK' });

        const res = await request(app).get('/summary');
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            total: 2,
            online: 1,
            offline: 1
        });
    });
});