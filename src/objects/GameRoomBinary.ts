import { DurableObject } from "cloudflare:workers";
import { encode, decode } from '@msgpack/msgpack';
import { GameState, GameAction } from "../types";

export class GameRoomBinary extends DurableObject {
    state: GameState;
    sockets: WebSocket[] = [];
    private lastStorageWrite = 0;

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
                    const action = decode(new Uint8Array(event.data as ArrayBuffer)) as GameAction;
                    this.handleAction(server, action);
                } catch (e) {
                    console.error("Invalid MsgPack", e);
                }
            });

            server.addEventListener('close', () => {
                this.sockets = this.sockets.filter(s => s !== server);
                console.log(`[BINARY] Client left. Total: ${this.sockets.length}`);
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
            // Write immediately for JOINs
            this.broadcastState();
            this.lastStorageWrite = Date.now();
            this.ctx.storage.put("state", encode(this.state));
        } else if (action.type === 'MOVE') {
            const player = this.state.players[action.payload.id];
            if (player) {
                player.x = action.payload.x;
                player.y = action.payload.y;
            }
            // Broadcast but batch storage writes every 500ms
            this.broadcastState();
            const now = Date.now();
            if (now - this.lastStorageWrite > 500) {
                this.lastStorageWrite = now;
                this.ctx.storage.put("state", encode(this.state));
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
