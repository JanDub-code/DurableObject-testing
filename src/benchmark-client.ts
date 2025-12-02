import WebSocket from 'ws';
import { encode, decode } from '@msgpack/msgpack';

const CLIENTS_PER_ROOM = 10;
const MOVES_PER_CLIENT = 20;
const ROOM_ID_JSON = "bench-room-json";
const ROOM_ID_BINARY = "bench-room-binary";

function runBenchmark(type: 'json' | 'binary', roomId: string) {
    console.log(`Starting ${type.toUpperCase()} Benchmark...`);
    const clients: WebSocket[] = [];
    let receivedUpdates = 0;
    const expectedUpdates = CLIENTS_PER_ROOM * MOVES_PER_CLIENT * CLIENTS_PER_ROOM;
    const startTime = performance.now();

    return new Promise<void>((resolve) => {
        let completedClients = 0;

        for (let i = 0; i < CLIENTS_PER_ROOM; i++) {
            // Use TARGET_URL env var or default to localhost
            const baseUrl = process.env.TARGET_URL || 'ws://localhost:8787';
            const url = `${baseUrl}/${type}/${roomId}`;
            const ws = new WebSocket(url);
            clients.push(ws);

            ws.on('open', () => {
                const joinMsg = type === 'json'
                    ? JSON.stringify({ type: 'JOIN', payload: { id: `player-${i}` } })
                    : encode({ type: 'JOIN', payload: { id: `player-${i}` } });

                ws.send(joinMsg);

                // Start sending moves
                let moves = 0;
                const interval = setInterval(() => {
                    if (moves >= MOVES_PER_CLIENT) {
                        clearInterval(interval);
                        completedClients++;
                        if (completedClients === CLIENTS_PER_ROOM) {
                            // All moves sent
                        }
                        return;
                    }

                    const movePayload = { id: `player-${i}`, x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) };
                    const moveMsg = type === 'json'
                        ? JSON.stringify({ type: 'MOVE', payload: movePayload })
                        : encode({ type: 'MOVE', payload: movePayload });

                    ws.send(moveMsg);
                    moves++;
                }, 50); // 20Hz
            });

            ws.on('message', (data: any) => {
                receivedUpdates++;
                // In binary mode, data is Buffer (Node.js)
                if (receivedUpdates >= expectedUpdates) {
                    // We might not receive ALL updates if they are batched or if we close too early, 
                    // but let's just wait for a bit after all moves are sent.
                }
            });

            ws.on('error', (err) => console.error(`Client ${i} error:`, err.message));
        }

        // Wait for benchmark to finish
        // Since we can't easily count exact broadcasts without reliable delivery guarantees in this simple script,
        // we'll just wait for the expected duration + buffer.
        const duration = (MOVES_PER_CLIENT * 50) + 2000;

        setTimeout(() => {
            const endTime = performance.now();
            console.log(`${type.toUpperCase()} Benchmark Finished.`);
            console.log(`Total Time: ${(endTime - startTime).toFixed(2)}ms`);
            console.log(`Total Updates Received: ${receivedUpdates} (Expected approx ${expectedUpdates})`);

            clients.forEach(c => c.close());
            resolve();
        }, duration);
    });
}

async function main() {
    await runBenchmark('json', ROOM_ID_JSON);
    console.log('-'.repeat(20));
    await runBenchmark('binary', ROOM_ID_BINARY);
}

main();
