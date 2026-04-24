import {TileInstance} from "./tile.model.js";
import {HandModel} from "./hand.model.js";

export enum GamePhase {
    Betting = "betting",
    Revealing = "revealing",
    GameOver = "gameOver",
}

export interface GameStateModel {
    drawPile: TileInstance[];
    discard: TileInstance[];
    currentHand: HandModel | null;
    previousHand: HandModel | null;
    currentScore: number;
    reshuffleCount: number;
    gamePhase: GamePhase;
    isPaused: boolean;
    lastResult: 'win' | 'lose' | null
}