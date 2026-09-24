const BASE_URL = 'http://localhost:3000';
const NUM_DEVICES = 5;
const HEARTBEAT_INTERVAL = 5000; // 5 seconds

async function registerDevice(id, name) {
    try {
        const res = await fetch(`${BASE_URL}/devices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, name })
        });
        if (res.ok) console.log(`[${id}] Registered successfully.`);
        else console.log(`[${id}] Failed to register: ${res.statusText}`);
    } catch (err) {
        console.error(`[${id}] Connection error: ${err.message}`);
    }
}

async function sendHeartbeat(id) {
    try {
        const payload = {
            timestamp: new Date().toISOString(),
            status: 'OK',
            cpu_usage: Math.floor(Math.random() * 100),
            signal_strength: -Math.floor(Math.random() * 100)
        };
        await fetch(`${BASE_URL}/devices/${id}/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log(`[${id}] Heartbeat sent.`);
    } catch (err) {
        console.error(`[${id}] Heartbeat failed: ${err.message}`);
    }
}

async function startSimulation() {
    console.log("Starting Fleet Simulator...\n");

    for (let i = 1; i <= NUM_DEVICES; i++) {
        const id = `device-0${i}`;
        const name = `Lab Device 0${i}`;
        
        await registerDevice(id, name);

        // Device 05 will intentionally stop after 15 seconds to trigger the timeout
        const shouldFailAfter = (i === 5) ? 15000 : null;
        let elapsed = 0;

        const intervalId = setInterval(() => {
            if (shouldFailAfter && elapsed >= shouldFailAfter) {
                console.log(`\n[${id}] Simulating failure... stopping heartbeats.\n`);
                clearInterval(intervalId);
                return;
            }
            
            sendHeartbeat(id);
            elapsed += HEARTBEAT_INTERVAL;
        }, HEARTBEAT_INTERVAL);
        
        // Initial heartbeat
        sendHeartbeat(id);
    }
}

startSimulation();