import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";

type Bindings = {
    GAME_ROOM_JSON: DurableObjectNamespace;
    GAME_ROOM_BINARY: DurableObjectNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// Serve static files (HTML, CSS, JS)
app.use("/", serveStatic({ path: "./index.html" }));

app.get("/json/:roomId", (c) => {
    const roomId = c.req.param("roomId");
    const id = c.env.GAME_ROOM_JSON.idFromName(roomId);
    const obj = c.env.GAME_ROOM_JSON.get(id);
    return obj.fetch(c.req.raw);
});

app.get("/binary/:roomId", (c) => {
    const roomId = c.req.param("roomId");
    const id = c.env.GAME_ROOM_BINARY.idFromName(roomId);
    const obj = c.env.GAME_ROOM_BINARY.get(id);
    return obj.fetch(c.req.raw);
});

export default app;
export { GameRoomJson } from "./objects/GameRoomJson";
export { GameRoomBinary } from "./objects/GameRoomBinary";
