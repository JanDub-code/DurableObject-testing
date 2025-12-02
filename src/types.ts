export interface Player {
    id: string;
    x: number;
    y: number;
    score: number;
    inventory: string[];
    status: 'active' | 'waiting' | 'disconnected';
}

export interface GameState {
    turn: number;
    activePlayerId: string;
    players: Record<string, Player>;
    board: number[][]; // 10x10 grid
    lastUpdate: number;
}

export interface GameAction {
    type: 'JOIN' | 'MOVE' | 'END_TURN';
    payload: any;
}
