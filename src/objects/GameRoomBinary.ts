import { DurableObject } from "cloudflare:workers";
import { encode, decode } from '@msgpack/msgpack';
import { GameState, GameAction } from "../types";

export class GameRoomBinary extends DurableObject {
    state: GameState;
    sockets: WebSocket[] = [];
    private lastStorageWrite = 0;
    private lastBroadcast = 0;

    constructor(ctx: DurableObjectState, env: any) {
        super(ctx, env);
        this.state = {
            turn: 0,
            activePlayerId: "",
            players: {},
            board: Array(10).fill(0).map(() => Array(10).fill(0)),
            lastUpdate: Date.now()
        };

        ctx.blockConcurrencyWhile(async () => {
            const stored = await ctx.storage.get<Uint8Array>("state");
            if (stored) {
                this.state = decode(stored) as GameState;
            }
        });
    }

    async fetch(request: Request) {
        if (request.headers.get("Upgrade") === "websocket") {
            const pair = new WebSocketPair();
            const [client, server] = Object.values(pair);

            this.sockets.push(server);
            server.accept();
            // server.binaryType = "arraybuffer"; // Default in Workers
            console.log(`[BINARY] Client joined. Total: ${this.sockets.length}`);

            server.addEventListener("message", (event) => {
                try {
                    let data: Uint8Array;
                    if (event.data instanceof ArrayBuffer) {
                        data = new Uint8Array(event.data);
                    } else if (event.data instanceof Uint8Array) {
                        data = event.data;
                    } else {
                        console.error("[BINARY] Unexpected data type:", typeof event.data);
                        return;
                    }
                    const action = decode(data) as GameAction;
                    this.handleAction(server, action);
                } catch (e) {
                    console.error("[BINARY] Invalid MsgPack:", e);
                }
            });

            server.addEventListener('close', () => {
                this.sockets = this.sockets.filter(s => s !== server);
                console.log(`[BINARY] Client left. Total: ${this.sockets.length}`);
            });

            server.addEventListener('error', (e) => {
                console.error(`[BINARY] WebSocket error:`, e);
                this.sockets = this.sockets.filter(s => s !== server);
            });

            return new Response(null, { status: 101, webSocket: client });
        }
        return new Response("Expected WebSocket", { status: 426 });
    }

    handleAction(sender: WebSocket, action: GameAction) {
        if (action.type === 'JOIN') {
            const playerId = action.payload.id;
            this.state.players[playerId] = {
                id: playerId,
                x: 0,
                y: 0,
                score: 0,
                inventory: [],
                status: 'active'
            };
            console.log(`[BINARY] Player ${playerId} joined game.`);
            // Broadcast immediately for JOINs
            this.broadcastState();
            this.lastBroadcast = Date.now();
            this.lastStorageWrite = Date.now();
            const encoded = encode(this.state);
            this.ctx.storage.put("state", new Uint8Array(encoded));
        } else if (action.type === 'MOVE') {
            const player = this.state.players[action.payload.id];
            if (player) {
                player.x = action.payload.x;
                player.y = action.payload.y;
            }
            // Throttle broadcasts to every 200ms (not every move)
            const now = Date.now();
            if (now - this.lastBroadcast > 200) {
                this.broadcastState();
                this.lastBroadcast = now;
            }
            // Batch storage writes every 500ms
            if (now - this.lastStorageWrite > 500) {
                this.lastStorageWrite = now;
                const encoded = encode(this.state);
                this.ctx.storage.put("state", new Uint8Array(encoded));
            }
        }
    }

    broadcastState() {
        const payload = encode(this.state);

        // Log every 100th turn to prove it's running
        if (this.state.turn % 100 === 0) {
            console.log(`[BINARY] Broadcasting turn ${this.state.turn} to ${this.sockets.length} clients. Size: ${payload.byteLength}b`);
        }

        for (const socket of this.sockets) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(payload);
            }
        }
    }
}
