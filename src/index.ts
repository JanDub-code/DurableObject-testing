import { Hono, Context } from "hono";

type Bindings = {
    GAME_ROOM_JSON: DurableObjectNamespace;
    GAME_ROOM_BINARY: DurableObjectNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// Serve HTML inline (serveStatic doesn't work properly in CF Workers without asset manifest)
app.get("/", (c: Context) => {
    return c.html(HTML_CONTENT);
});

app.get("/json/:roomId", (c: Context<{ Bindings: Bindings }>) => {
    const roomId = c.req.param("roomId");
    const id = c.env.GAME_ROOM_JSON.idFromName(roomId);
    const obj = c.env.GAME_ROOM_JSON.get(id);
    return obj.fetch(c.req.raw);
});

app.get("/binary/:roomId", (c: Context<{ Bindings: Bindings }>) => {
    const roomId = c.req.param("roomId");
    const id = c.env.GAME_ROOM_BINARY.idFromName(roomId);
    const obj = c.env.GAME_ROOM_BINARY.get(id);
    return obj.fetch(c.req.raw);
});

export default app;
export { GameRoomJson } from "./objects/GameRoomJson";
export { GameRoomBinary } from "./objects/GameRoomBinary";

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Durable Objects Benchmark</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
        }

        h1 {
            color: white;
            margin-bottom: 30px;
            text-align: center;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .benchmark-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }

        .benchmark-card {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .benchmark-card h2 {
            font-size: 1.5em;
            margin-bottom: 20px;
            color: #333;
        }

        .benchmark-card.json h2 {
            color: #667eea;
        }

        .benchmark-card.binary h2 {
            color: #764ba2;
        }

        .config-group {
            margin-bottom: 15px;
        }

        label {
            display: block;
            font-size: 0.9em;
            color: #666;
            margin-bottom: 5px;
            font-weight: 500;
        }

        input[type="number"], input[type="text"] {
            width: 100%;
            padding: 10px;
            border: 2px solid #eee;
            border-radius: 5px;
            font-size: 1em;
            transition: border-color 0.3s;
        }

        input[type="number"]:focus, input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }

        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        button {
            flex: 1;
            padding: 12px 20px;
            border: none;
            border-radius: 5px;
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .btn-start {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-start:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-start:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .stats {
            margin-top: 20px;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 5px;
            min-height: 100px;
        }

        .stat-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 0.95em;
        }

        .stat-label {
            color: #666;
            font-weight: 500;
        }

        .stat-value {
            font-weight: 700;
            color: #333;
        }

        .status {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 5px;
        }

        .status.idle {
            background: #ccc;
        }

        .status.running {
            background: #ffc107;
            animation: pulse 1s infinite;
        }

        .status.success {
            background: #28a745;
        }

        .status.error {
            background: #dc3545;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .log-container {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-top: 20px;
        }

        .log-container h3 {
            margin-bottom: 15px;
            color: #333;
        }

        .log-output {
            background: #1e1e1e;
            color: #d4d4d4;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            height: 300px;
            overflow-y: auto;
            line-height: 1.5;
        }

        .log-line {
            margin-bottom: 5px;
        }

        .log-line.json {
            color: #9cdcfe;
        }

        .log-line.binary {
            color: #ce9178;
        }

        .log-line.info {
            color: #6a9955;
        }

        .log-line.error {
            color: #f48771;
        }

        .debug-panel {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-top: 20px;
        }

        .debug-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            user-select: none;
        }

        .debug-header h3 {
            color: #333;
            margin: 0;
        }

        .debug-toggle {
            width: 30px;
            height: 30px;
            background: #f0f0f0;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
        }

        .debug-toggle:hover {
            background: #667eea;
            color: white;
        }

        .debug-content {
            margin-top: 20px;
            max-height: 500px;
            overflow-y: auto;
            display: none;
        }

        .debug-content.open {
            display: block;
        }

        .debug-section {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }

        .debug-section:last-child {
            border-bottom: none;
        }

        .debug-section-title {
            font-weight: 700;
            color: #667eea;
            margin-bottom: 10px;
            font-size: 0.9em;
            text-transform: uppercase;
        }

        .debug-info {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            line-height: 1.6;
            color: #333;
            white-space: pre-wrap;
            word-break: break-all;
        }

        .debug-stat {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
            font-size: 0.9em;
        }

        .debug-stat:last-child {
            border-bottom: none;
        }

        .debug-stat-label {
            color: #666;
            font-weight: 500;
        }

        .debug-stat-value {
            font-family: 'Courier New', monospace;
            color: #333;
            font-weight: 600;
        }

        .comparison {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-top: 20px;
        }

        .comparison h3 {
            margin-bottom: 15px;
            color: #333;
        }

        .comparison-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }

        .comparison-row:last-child {
            border-bottom: none;
        }

        .comparison-label {
            font-weight: 600;
            color: #666;
        }

        .comparison-values {
            display: flex;
            gap: 30px;
        }

        .comparison-value {
            min-width: 150px;
            text-align: right;
        }

        .winner {
            color: #28a745;
            font-weight: 700;
        }

        @media (max-width: 768px) {
            .benchmark-grid {
                grid-template-columns: 1fr;
            }

            h1 {
                font-size: 1.8em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎮 Durable Objects Benchmark</h1>

        <div class="benchmark-grid">
            <!-- JSON Benchmark -->
            <div class="benchmark-card json">
                <h2><span class="status idle" id="status-json"></span>JSON Format</h2>
                
                <div class="config-group">
                    <label>Clients per room</label>
                    <input type="number" id="json-clients" value="10" min="1" max="100">
                </div>

                <div class="config-group">
                    <label>Moves per client</label>
                    <input type="number" id="json-moves" value="20" min="1" max="200">
                </div>

                <div class="button-group">
                    <button class="btn-start" id="json-start">Start Benchmark</button>
                    <button class="btn-start" id="json-reset" style="background: #ccc; color: #333;">Reset</button>
                </div>

                <div class="stats">
                    <div class="stat-row">
                        <span class="stat-label">Status:</span>
                        <span class="stat-value" id="json-status">Idle</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Duration:</span>
                        <span class="stat-value" id="json-duration">—</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Updates received:</span>
                        <span class="stat-value" id="json-updates">0</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Total messages:</span>
                        <span class="stat-value" id="json-total">0</span>
                    </div>
                </div>
            </div>

            <!-- Binary Benchmark -->
            <div class="benchmark-card binary">
                <h2><span class="status idle" id="status-binary"></span>Binary Format (MsgPack)</h2>
                
                <div class="config-group">
                    <label>Clients per room</label>
                    <input type="number" id="binary-clients" value="10" min="1" max="100">
                </div>

                <div class="config-group">
                    <label>Moves per client</label>
                    <input type="number" id="binary-moves" value="20" min="1" max="200">
                </div>

                <div class="button-group">
                    <button class="btn-start" id="binary-start">Start Benchmark</button>
                    <button class="btn-start" id="binary-reset" style="background: #ccc; color: #333;">Reset</button>
                </div>

                <div class="stats">
                    <div class="stat-row">
                        <span class="stat-label">Status:</span>
                        <span class="stat-value" id="binary-status">Idle</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Duration:</span>
                        <span class="stat-value" id="binary-duration">—</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Updates received:</span>
                        <span class="stat-value" id="binary-updates">0</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Total messages:</span>
                        <span class="stat-value" id="binary-total">0</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Comparison -->
        <div class="comparison" id="comparison" style="display: none;">
            <h3>📊 Comparison Results</h3>
            <div class="comparison-row">
                <span class="comparison-label">Format</span>
                <div class="comparison-values">
                    <div class="comparison-value">JSON</div>
                    <div class="comparison-value">Binary (MsgPack)</div>
                </div>
            </div>
            <div class="comparison-row">
                <span class="comparison-label">Duration (ms)</span>
                <div class="comparison-values">
                    <div class="comparison-value" id="comp-duration-json">—</div>
                    <div class="comparison-value" id="comp-duration-binary">—</div>
                </div>
            </div>
            <div class="comparison-row">
                <span class="comparison-label">Updates Received</span>
                <div class="comparison-values">
                    <div class="comparison-value" id="comp-updates-json">—</div>
                    <div class="comparison-value" id="comp-updates-binary">—</div>
                </div>
            </div>
            <div class="comparison-row">
                <span class="comparison-label">Efficiency (updates/ms)</span>
                <div class="comparison-values">
                    <div class="comparison-value" id="comp-efficiency-json">—</div>
                    <div class="comparison-value" id="comp-efficiency-binary">—</div>
                </div>
            </div>
        </div>

        <!-- Logs -->
        <div class="log-container">
            <h3>📝 Live Log</h3>
            <div class="log-output" id="log-output"></div>
        </div>

        <!-- Debug Panel -->
        <div class="debug-panel">
            <div class="debug-header" onclick="toggleDebug()">
                <h3>🔧 Debug Information</h3>
                <button class="debug-toggle" id="debug-toggle">▼</button>
            </div>
            <div class="debug-content" id="debug-content">
                <div class="debug-section">
                    <div class="debug-section-title">JSON Benchmark Debug</div>
                    <div id="debug-json-stats"></div>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Binary Benchmark Debug</div>
                    <div id="debug-binary-stats"></div>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Connection Details (JSON)</div>
                    <div class="debug-info" id="debug-json-connections"></div>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Connection Details (Binary)</div>
                    <div class="debug-info" id="debug-binary-connections"></div>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Raw Debug Output</div>
                    <div class="debug-info" id="debug-raw"></div>
                </div>
            </div>
        </div>
    </div>

    <script type="module">
        const API_URL = window.location.origin;
        const logs = [];
        const maxLogs = 100;

        let debugData = {
            json: {
                connections: [],
                stats: {
                    sent: 0,
                    received: 0,
                    errors: 0,
                    timeouts: 0,
                    startTime: null,
                    endTime: null
                }
            },
            binary: {
                connections: [],
                stats: {
                    sent: 0,
                    received: 0,
                    errors: 0,
                    timeouts: 0,
                    startTime: null,
                    endTime: null
                }
            },
            raw: []
        };

        function toggleDebug() {
            const content = document.getElementById('debug-content');
            const toggle = document.getElementById('debug-toggle');
            content.classList.toggle('open');
            toggle.textContent = content.classList.contains('open') ? '▲' : '▼';
        }

        function addDebugRaw(message, data = null) {
            const timestamp = new Date().toISOString();
            const entry = \`[\${timestamp}] \${message}\${data ? '\\n' + JSON.stringify(data, null, 2) : ''}\`;
            debugData.raw.push(entry);
            if (debugData.raw.length > 50) debugData.raw.shift();
            updateDebugDisplay();
        }

        function updateDebugDisplay() {
            // JSON Stats
            const jsonStats = debugData.json.stats;
            const jsonStatsHtml = \`
                <div class="debug-stat">
                    <span class="debug-stat-label">Messages Sent:</span>
                    <span class="debug-stat-value">\${jsonStats.sent}</span>
                </div>
                <div class="debug-stat">
                    <span class="debug-stat-label">Messages Received:</span>
                    <span class="debug-stat-value">\${jsonStats.received}</span>
                </div>
                <div class="debug-stat">
                    <span class="debug-stat-label">Errors:</span>
                    <span class="debug-stat-value">\${jsonStats.errors}</span>
                </div>
                <div class="debug-stat">
                    <span class="debug-stat-label">Timeouts:</span>
                    <span class="debug-stat-value">\${jsonStats.timeouts}</span>
                </div>
                <div class="debug-stat">
                    <span class="debug-stat-label">Duration:</span>
                    <span class="debug-stat-value">\${jsonStats.startTime && jsonStats.endTime ? (jsonStats.endTime - jsonStats.startTime).toFixed(2) + 'ms' : 'N/A'}</span>
                </div>
            \`;
            document.getElementById('debug-json-stats').innerHTML = jsonStatsHtml;

            // Binary Stats
            const binaryStats = debugData.binary.stats;
            const binaryStatsHtml = \`
                <div class="debug-stat">
                    <span class="debug-stat-label">Messages Sent:</span>
                    <span class="debug-stat-value">\${binaryStats.sent}</span>
                </div>
                <div class="debug-stat">
                    <span class="debug-stat-label">Messages Received:</span>
                    <span class="debug-stat-value">\${binaryStats.received}</span>
                </div>
                <div class="debug-stat">
                    <span class="debug-stat-label">Errors:</span>
                    <span class="debug-stat-value">\${binaryStats.errors}</span>
                </div>
                <div class="debug-stat">
                    <span class="debug-stat-label">Timeouts:</span>
                    <span class="debug-stat-value">\${binaryStats.timeouts}</span>
                </div>
                <div class="debug-stat">
                    <span class="debug-stat-label">Duration:</span>
                    <span class="debug-stat-value">\${binaryStats.startTime && binaryStats.endTime ? (binaryStats.endTime - binaryStats.startTime).toFixed(2) + 'ms' : 'N/A'}</span>
                </div>
            \`;
            document.getElementById('debug-binary-stats').innerHTML = binaryStatsHtml;

            // Connections
            const jsonConnHtml = debugData.json.connections.map((c, i) => 
                \`Client \${i}: state=\${c.state}, sent=\${c.sent}, received=\${c.received}, errors=\${c.errors}\`
            ).join('\\n') || 'No connections yet';
            document.getElementById('debug-json-connections').textContent = jsonConnHtml;

            const binaryConnHtml = debugData.binary.connections.map((c, i) => 
                \`Client \${i}: state=\${c.state}, sent=\${c.sent}, received=\${c.received}, errors=\${c.errors}\`
            ).join('\\n') || 'No connections yet';
            document.getElementById('debug-binary-connections').textContent = binaryConnHtml;

            // Raw output
            document.getElementById('debug-raw').textContent = debugData.raw.join('\\n\\n');
        }

        function addLog(message, type = 'info') {
            logs.push({ message, type, time: new Date().toLocaleTimeString() });
            if (logs.length > maxLogs) logs.shift();
            addDebugRaw(\`[\${type.toUpperCase()}] \${message}\`);
            updateLogDisplay();
        }

        function updateLogDisplay() {
            const logOutput = document.getElementById('log-output');
            logOutput.innerHTML = logs.map(log => 
                \`<div class="log-line \${log.type}"><strong>[\${log.time}]</strong> \${escapeHtml(log.message)}</div>\`
            ).join('');
            logOutput.scrollTop = logOutput.scrollHeight;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function setStatus(type, status) {
            const statusEl = document.getElementById(\`status-\${type}\`);
            const statusText = document.getElementById(\`\${type}-status\`);
            
            statusEl.className = 'status ' + status;
            statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }

        async function runBenchmark(type) {
            const clients = parseInt(document.getElementById(\`\${type}-clients\`).value);
            const moves = parseInt(document.getElementById(\`\${type}-moves\`).value);

            if (clients < 1 || moves < 1) {
                addLog(\`Invalid config for \${type}\`, 'error');
                return;
            }

            // Reset debug data
            debugData[type] = {
                connections: [],
                stats: {
                    sent: 0,
                    received: 0,
                    errors: 0,
                    timeouts: 0,
                    startTime: performance.now(),
                    endTime: null
                }
            };

            addLog(\`Starting \${type.toUpperCase()} benchmark (\${clients} clients, \${moves} moves each)\`, 'info');
            addDebugRaw(\`Benchmark started: \${type}\`, { clients, moves, totalMessages: clients * moves });
            setStatus(type, 'running');

            const roomId = \`bench-room-\${type}-\${Date.now()}\`;
            const baseUrl = API_URL;
            const wsConnections = [];
            let receivedUpdates = 0;
            const expectedUpdates = clients * moves * clients;
            const startTime = performance.now();
            let completedClients = 0;

            try {
                // Create MsgPack encoder for binary
                let encode = null;
                if (type === 'binary') {
                    const { encode: msgPackEncode } = await import('https://cdn.jsdelivr.net/npm/@msgpack/msgpack@3/+esm');
                    encode = msgPackEncode;
                }

                // Create WebSocket connections
                for (let i = 0; i < clients; i++) {
                    const url = \`\${baseUrl.replace('http', 'ws')}/\${type}/\${roomId}\`;
                    const ws = new WebSocket(url);
                    
                    const connDebug = {
                        id: i,
                        state: 'connecting',
                        sent: 0,
                        received: 0,
                        errors: 0,
                        startTime: performance.now(),
                        url: url
                    };
                    debugData[type].connections.push(connDebug);

                    wsConnections.push({ ws, index: i, moves: 0 });

                    ws.binaryType = 'arraybuffer';
                    
                    ws.onopen = () => {
                        connDebug.state = 'open';
                        const joinMsg = type === 'json'
                            ? JSON.stringify({ type: 'JOIN', payload: { id: \`player-\${i}\` } })
                            : encode({ type: 'JOIN', payload: { id: \`player-\${i}\` } });
                        ws.send(joinMsg);
                        connDebug.sent++;
                        debugData[type].stats.sent++;
                        addLog(\`Client \${i} connected to \${roomId.substring(0, 20)}...\`, 'info');
                        addDebugRaw(\`Connection opened for client \${i}\`, { url });

                        // Start sending moves
                        let moveCount = 0;
                        const interval = setInterval(() => {
                            if (moveCount >= moves) {
                                clearInterval(interval);
                                completedClients++;
                                addLog(\`Client \${i} finished sending \${moves} moves\`, 'info');
                                return;
                            }

                            const movePayload = {
                                id: \`player-\${i}\`,
                                x: Math.floor(Math.random() * 10),
                                y: Math.floor(Math.random() * 10)
                            };
                            const moveMsg = type === 'json'
                                ? JSON.stringify({ type: 'MOVE', payload: movePayload })
                                : encode({ type: 'MOVE', payload: movePayload });
                            
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(moveMsg);
                                connDebug.sent++;
                                debugData[type].stats.sent++;
                            } else {
                                addDebugRaw(\`Failed to send move: client \${i} not OPEN (state: \${ws.readyState})\`);
                            }
                            moveCount++;
                        }, 50);
                    };

                    ws.onmessage = (event) => {
                        connDebug.received++;
                        debugData[type].stats.received++;
                        receivedUpdates++;
                        document.getElementById(\`\${type}-updates\`).textContent = receivedUpdates;
                    };

                    ws.onerror = (err) => {
                        connDebug.errors++;
                        connDebug.state = 'error';
                        debugData[type].stats.errors++;
                        addLog(\`Client \${i} error: \${err.message || 'Unknown error'}\`, 'error');
                        addDebugRaw(\`WebSocket error on client \${i}\`, { error: err.message, readyState: ws.readyState });
                    };

                    ws.onclose = (event) => {
                        connDebug.state = 'closed';
                        connDebug.endTime = performance.now();
                        addLog(\`Client \${i} disconnected (code: \${event.code})\`, 'info');
                        addDebugRaw(\`Connection closed for client \${i}\`, { code: event.code, reason: event.reason });
                    };
                }

                // Wait for benchmark to complete
                const duration = (moves * 50) + 2000;
                await new Promise(resolve => setTimeout(resolve, duration));

                const endTime = performance.now();
                const totalTime = (endTime - startTime).toFixed(2);
                debugData[type].stats.endTime = endTime;

                document.getElementById(\`\${type}-duration\`).textContent = \`\${totalTime}ms\`;
                document.getElementById(\`\${type}-total\`).textContent = clients * moves;

                addLog(\`\${type.toUpperCase()} benchmark finished in \${totalTime}ms (\${receivedUpdates} updates received)\`, 'info');
                addDebugRaw(\`Benchmark completed: \${type}\`, { 
                    duration: totalTime, 
                    received: receivedUpdates,
                    expected: expectedUpdates,
                    successRate: ((receivedUpdates / expectedUpdates) * 100).toFixed(2) + '%'
                });
                setStatus(type, 'success');

                wsConnections.forEach(({ ws }) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close();
                    }
                });

                updateDebugDisplay();

                return {
                    type,
                    duration: parseFloat(totalTime),
                    updates: receivedUpdates,
                    total: clients * moves
                };

            } catch (err) {
                addLog(\`Error running \${type} benchmark: \${err.message}\`, 'error');
                addDebugRaw(\`Exception in benchmark: \${type}\`, { error: err.message, stack: err.stack });
                setStatus(type, 'error');
                wsConnections.forEach(({ ws }) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close();
                    }
                });
                updateDebugDisplay();
            }
        }

        function updateComparison(results) {
            const comparison = document.getElementById('comparison');
            if (!results.json || !results.binary) return;

            document.getElementById('comp-duration-json').textContent = results.json.duration.toFixed(2) + 'ms';
            document.getElementById('comp-duration-binary').textContent = results.binary.duration.toFixed(2) + 'ms';
            document.getElementById('comp-updates-json').textContent = results.json.updates;
            document.getElementById('comp-updates-binary').textContent = results.binary.updates;

            const effJson = (results.json.updates / results.json.duration).toFixed(2);
            const effBinary = (results.binary.updates / results.binary.duration).toFixed(2);
            document.getElementById('comp-efficiency-json').textContent = effJson;
            document.getElementById('comp-efficiency-binary').textContent = effBinary;

            comparison.style.display = 'block';

            if (results.json.duration < results.binary.duration) {
                document.getElementById('comp-duration-json').classList.add('winner');
            } else {
                document.getElementById('comp-duration-binary').classList.add('winner');
            }
        }

        let results = {};

        // Event listeners
        document.getElementById('json-start').addEventListener('click', async () => {
            results.json = await runBenchmark('json');
            updateComparison(results);
        });

        document.getElementById('binary-start').addEventListener('click', async () => {
            results.binary = await runBenchmark('binary');
            updateComparison(results);
        });

        document.getElementById('json-reset').addEventListener('click', () => {
            document.getElementById('json-clients').value = 10;
            document.getElementById('json-moves').value = 20;
            document.getElementById('json-status').textContent = 'Idle';
            document.getElementById('json-duration').textContent = '—';
            document.getElementById('json-updates').textContent = '0';
            document.getElementById('json-total').textContent = '0';
            document.getElementById('status-json').className = 'status idle';
            results.json = null;
            updateComparison(results);
            addDebugRaw('JSON benchmark reset');
            updateDebugDisplay();
        });

        document.getElementById('binary-reset').addEventListener('click', () => {
            document.getElementById('binary-clients').value = 10;
            document.getElementById('binary-moves').value = 20;
            document.getElementById('binary-status').textContent = 'Idle';
            document.getElementById('binary-duration').textContent = '—';
            document.getElementById('binary-updates').textContent = '0';
            document.getElementById('binary-total').textContent = '0';
            document.getElementById('status-binary').className = 'status idle';
            results.binary = null;
            updateComparison(results);
            addDebugRaw('Binary benchmark reset');
            updateDebugDisplay();
        });

        addLog('Benchmark UI ready. Configure and start tests!', 'info');
        updateDebugDisplay();
    </script>
</body>
</html>`;
