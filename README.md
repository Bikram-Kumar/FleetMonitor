# Mini Device Fleet Monitor

## What the project does
The Mini Device Fleet Monitor is a lightweight REST API built to track the real-time status of a fleet of remote devices. Devices register with the system and periodically send "heartbeat" payloads. The application tracks these heartbeats and provides an operator dashboard API to view individual device details, list all devices, and see a fleet-wide summary. 

A core feature is the automatic status detection: devices are considered **ONLINE** if a heartbeat was received within the last 30 seconds, and automatically transition to **OFFLINE** if the 30-second window is missed.

## Design / Architecture
*   **Framework:** Node.js with Express for lightweight, fast HTTP routing.
*   **Storage:** Data is stored in an in-memory `Map`. This satisfies the requirement for a small, working solution without the overhead of setting up external database dependencies.
*   **State Calculation (On-the-Fly):** Instead of running a background polling thread that constantly loops through devices to mark them offline (which can cause CPU spikes and race conditions), the `status` (ONLINE/OFFLINE) is calculated **statelessy and dynamically** at the exact moment a `GET` request is made. The system compares the current server time with the last heartbeat time.
*   **Testing:** Jest and Supertest are used for automated testing. `jest.useFakeTimers()` is heavily utilized to test the 30-second timeout logic instantly without making the test suite wait.

## Prerequisites
*   **Node.js:** v18.0 or higher (Node v18+ is required for the native `fetch` API used in the simulator).
*   **npm:** Node Package Manager (comes with Node.js).

## How to build the application
1. Clone or extract the project files into a directory.
2. Navigate to the project directory in your terminal.
3. Install the required dependencies:
   ```bash
   npm install express
   npm install --save-dev jest supertest
   ```

## How to run the application
Start the Express server using Node:
```bash
npm start
# OR
node server.js
```
The server will start and listen on `http://localhost:3000`.

## How to run the simulator
Open a **new terminal window** (leave the server running in the first one) and run:
```bash
node simulator/simulator.js
```
The simulator will automatically register 5 devices and start sending heartbeats every 5 seconds. **Device 05** is intentionally programmed to crash after 15 seconds so you can observe the system automatically marking it as OFFLINE.

## How to run the tests
You can run the automated test suite using Jest. The server does *not* need to be running to execute the tests.
```bash
npm test
```

## Example API Requests

**1. Register a Device**
```bash
curl -X POST http://localhost:3000/devices \
     -H "Content-Type: application/json" \
     -d '{"id": "device-01", "name": "Lab Device 01"}'
```

**2. Send a Heartbeat**
```bash
curl -X POST http://localhost:3000/devices/device-01/heartbeat \
     -H "Content-Type: application/json" \
     -d '{"timestamp": "2026-09-21T10:30:00Z", "status": "OK", "cpu_usage": 42}'
```

**3. List All Devices**
```bash
curl http://localhost:3000/devices
```

**4. Get Device Details**
```bash
curl http://localhost:3000/devices/device-01
```

**5. Get Fleet Summary**
```bash
curl http://localhost:3000/summary
```

## Assumptions you made
1.  **Clock Synchronization:** By using the timestamp provided in the heartbeat payload to calculate the 30-second window, the system assumes the client device clocks and the server clock are perfectly synchronized (NTP). 
2.  **Concurrency Limit:** The fleet is small enough that Node's single-threaded event loop can handle the incoming heartbeat traffic.
3.  **Ephemeral Data:** Data persistence across server restarts is not required for this prototype.

## Known limitations
*   **Data Loss:** Because the database is in-memory, all registered devices and heartbeat histories are lost if the Node process restarts.
*   **No Authentication:** The API is completely open. Any client can register a device or spoof a heartbeat for an existing device.
*   **Input Validation:** Very basic input validation is implemented. A malformed timestamp string could break the status calculation.

## What you would improve if you had one additional day
1.  **Database Integration:** I would replace the in-memory `Map` with a real persistence layer. **Redis** would be perfect for caching the ultra-fast heartbeat writes with built-in TTLs (Time-to-Live), backed by **PostgreSQL** for storing device metadata.
2.  **Clock Drift Handling:** Relying on client timestamps is dangerous in IoT. I would change the timeout logic to use the *server's receipt time* (`Date.now()` upon receiving the request) rather than trusting the payload timestamp to prevent false OFFLINE statuses due to clock drift.
3.  **Strict Validation:** Implement a schema validation library like `Zod` or `Joi` to strictly enforce API payload structures.
4.  **WebSockets (Real-time Dashboard):** Instead of requiring operators to repeatedly HTTP GET `/summary`, I would add a WebSocket endpoint to push state changes to a UI instantly when a device crosses the 30-second threshold.
5.  **Dockerization:** Write a `Dockerfile` and `docker-compose.yml` to make the application and test suite entirely self-contained and reproducible.



## AI Usage


### Which AI tools you used
    Gemini
### What you used them for
    Generating the template for project 
### One suggestion or piece of generated code that you changed, rejected, or improved
    Changed folder structure and overall integration
### One thing you personally verified before submitting
    Verified the API implementations and tested them