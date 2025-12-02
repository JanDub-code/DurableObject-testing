import { DurableObject } from "cloudflare:workers";
import { GameState, GameAction, Player } from "../types";

export class GameRoomJson extends DurableObject {
    state: GameState;
    sockets: WebSocket[] = [];

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
            server.accept();

            server.addEventListener("message", (event) => {
                try {
                    const action = JSON.parse(event.data as string) as GameAction;
                    this.handleAction(server, action);
                } catch (e) {
                    console.error("Invalid JSON", e);
                }
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
        } else if (action.type === 'MOVE') {
            const player = this.state.players[action.payload.id];
            if (player) {
                player.x = action.payload.x;
                player.y = action.payload.y;
            }
        }

        this.broadcastState();
        this.ctx.storage.put("state", JSON.stringify(this.state));
    }

    broadcastState() {
        const payload = JSON.stringify(this.state);
        for (const socket of this.sockets) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(payload);
            }
        }
    }
}
