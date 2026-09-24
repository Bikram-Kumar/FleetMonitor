const express = require('express');

const app = express();
app.use(express.json());

// --- In-Memory Database ---
// Key: deviceId, Value: { name, lastHeartbeat, metrics }
const devicesDb = new Map();
const TIMEOUT_MS = 30 * 1000;

// --- Helper Functions ---
function calculateStatus(lastHeartbeat) {
    if (!lastHeartbeat) return "OFFLINE";
    
    // Calculate the difference between current server time and last heartbeat
    const now = Date.now();
    const heartbeatTime = new Date(lastHeartbeat).getTime();
    
    if (now - heartbeatTime <= TIMEOUT_MS) {
        return "ONLINE";
    }
    return "OFFLINE";
}

function formatDeviceResponse(id, deviceData) {
    return {
        id: id,
        name: deviceData.name,
        status: calculateStatus(deviceData.lastHeartbeat),
        last_heartbeat: deviceData.lastHeartbeat
    };
}





// --- API Endpoints ---

app.post('/devices', (req, res) => {
    const { id, name } = req.body;
    
    if (!id || !name) {
        return res.status(400).json({ error: "id and name are required" });
    }
    if (devicesDb.has(id)) {
        return res.status(400).json({ error: "Device ID already exists" });
    }
    
    const newDevice = { name, lastHeartbeat: null, metrics: null };
    devicesDb.set(id, newDevice);
    
    res.status(201).json(formatDeviceResponse(id, newDevice));
});

app.post('/devices/:id/heartbeat', (req, res) => {
    const deviceId = req.params.id;
    const { timestamp, status, cpu_usage, signal_strength } = req.body;

    if (!devicesDb.has(deviceId)) {
        return res.status(404).json({ error: "Device not found" });
    }

    const deviceData = devicesDb.get(deviceId);
    deviceData.lastHeartbeat = timestamp;
    deviceData.metrics = { cpu_usage, signal_strength, status };

    res.status(202).json({ message: "Heartbeat processed" });
});

app.get('/devices', (req, res) => {
    const result = [];
    for (const [id, data] of devicesDb.entries()) {
        result.push(formatDeviceResponse(id, data));
    }
    res.json(result);
});

app.get('/devices/:id', (req, res) => {
    const deviceId = req.params.id;
    if (!devicesDb.has(deviceId)) {
        return res.status(404).json({ error: "Device not found" });
    }
    
    res.json(formatDeviceResponse(deviceId, devicesDb.get(deviceId)));
});

app.get('/summary', (req, res) => {
    let online = 0;
    let offline = 0;
    
    for (const data of devicesDb.values()) {
        if (calculateStatus(data.lastHeartbeat) === "ONLINE") {
            online++;
        } else {
            offline++;
        }
    }
    
    res.json({
        total: devicesDb.size,
        online,
        offline
    });
});





// Export the app for testing, or start it if run directly
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = { app, devicesDb };