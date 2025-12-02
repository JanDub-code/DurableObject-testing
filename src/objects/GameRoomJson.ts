import { DurableObject } from "cloudflare:workers";
import { GameState, GameAction, Player } from "../types";

export class GameRoomJson extends DurableObject {
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
            const stored = await ctx.storage.get<string>("state");
            if (stored) {
                this.state = JSON.parse(stored);
            }
        });
    }

    async fetch(request: Request) {
        if (request.headers.get("Upgrade") === "websocket") {
            const pair = new WebSocketPair();
            const [client, server] = Object.values(pair);

            this.sockets.push(server);
            console.log(`[JSON] Client joined. Total: ${this.sockets.length}`);
            server.accept();

            server.addEventListener("message", (event) => {
                try {
                    const action = JSON.parse(event.data as string) as GameAction;
                    // console.log('[JSON] Received action:', action.type); // Too noisy for benchmark
                    this.handleAction(server, action);
                } catch (e) {
                    console.error("[JSON] Error parsing message:", e);
                }
            });

            server.addEventListener('close', () => {
                this.sockets = this.sockets.filter(s => s !== server);
                console.log(`[JSON] Client left. Total: ${this.sockets.length}`);
            });

            return new Response(null, { status: 101, webSocket: client });
        }
        return new Response("Expected WebSocket", { status: 426 });
    }

    handleAction(sender: WebSocket, action: GameAction) {
        // Simulate game logic
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
            console.log(`[JSON] Player ${playerId} joined game.`);
            // Broadcast immediately for JOINs
            this.broadcastState();
            this.lastBroadcast = Date.now();
            this.lastStorageWrite = Date.now();
            this.ctx.storage.put("state", JSON.stringify(this.state));
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
                this.ctx.storage.put("state", JSON.stringify(this.state));
            }
        }
    }

    broadcastState() {
        const payload = JSON.stringify(this.state);

        // Log every 100th turn to prove it's running without flooding logs
        if (this.state.turn % 100 === 0) {
            console.log(`[JSON] Broadcasting turn ${this.state.turn} to ${this.sockets.length} clients`);
        }

        for (const socket of this.sockets) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(payload);
            }
        }
    }
}