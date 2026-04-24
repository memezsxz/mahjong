import {TileInstance} from "./tile.model.js";
import {HandModel} from "./hand.model.js";

export enum GamePhase {
    Betting = "betting",
    Revealing = "revealing",
    GameOver = "gameOver",
}

export type HandResult = 'win' | 'lose' | null;

export interface GameStateModel {
    drawPile: TileInstance[];
    discard: TileInstance[];
    currentHand: HandModel | null;
    previousHand: HandModel | null;
    winStreak: number;
    currentScore: number;
    reshuffleCount: number;
    gamePhase: GamePhase;
    isPaused: boolean;
    lastResult: HandResult
}