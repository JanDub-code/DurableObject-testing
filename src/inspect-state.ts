import { encode } from '@msgpack/msgpack';
import { GameState, Player } from './types.ts';

// Helper to generate a full realistic state
const generateFullState = (): GameState => {
    const players: Record<string, Player> = {};
    for (let i = 0; i < 10; i++) {
        players[`player-${i}`] = {
            id: `player-${i}`,
            x: Math.floor(Math.random() * 10),
            y: Math.floor(Math.random() * 10),
            score: Math.floor(Math.random() * 1000),
            inventory: ['sword', 'shield', 'potion', 'map', 'key'],
            status: 'active'
        };
    }

    return {
        turn: 42,
        activePlayerId: 'player-0',
        players,
        board: Array(10).fill(0).map(() => Array(10).fill(1)), // Filled board
        lastUpdate: Date.now()
    };
};

const state = generateFullState();
const jsonString = JSON.stringify(state, null, 2);
const jsonMinified = JSON.stringify(state);
const binaryBuffer = encode(state);

console.log("--- JSON FULL STRUCTURE ---");
console.log(jsonString);
console.log("\n--- SIZE COMPARISON ---");
console.log(`JSON (Minified): ${jsonMinified.length} bytes`);
console.log(`Binary (MsgPack): ${binaryBuffer.byteLength} bytes`);
console.log(`Savings: ${((1 - binaryBuffer.byteLength / jsonMinified.length) * 100).toFixed(2)}%`);
