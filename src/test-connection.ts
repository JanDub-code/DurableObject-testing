import WebSocket from 'ws';

const baseUrl = process.env.TARGET_URL || 'wss://durableobjects-testing.dubstolcova.workers.dev';
const url = `${baseUrl}/json/test-room`;

console.log(`Connecting to: ${url}`);

const ws = new WebSocket(url);

ws.on('open', () => {
    console.log('✅ WebSocket connected!');
    
    const joinMsg = JSON.stringify({ type: 'JOIN', payload: { id: 'test-player' } });
    console.log('Sending JOIN message:', joinMsg);
    ws.send(joinMsg);
});

ws.on('message', (data: any) => {
    console.log('📩 Received message:', data.toString().substring(0, 200));
});

ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err);
});

ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket closed. Code: ${code}, Reason: ${reason.toString()}`);
});

ws.on('unexpected-response', (req, res) => {
    console.error(`❌ Unexpected response: ${res.statusCode} ${res.statusMessage}`);
    let body = '';
    res.on('data', (chunk: Buffer) => body += chunk.toString());
    res.on('end', () => console.log('Response body:', body));
});

// Close after 5 seconds
setTimeout(() => {
    console.log('Closing connection after timeout...');
    ws.close();
    process.exit(0);
}, 5000);
