import {TileInstance} from "./tile.model.js";
import {HandModel} from "./hand.model.js";

export enum GamePhase {
    Idle = "idle",
    Betting = "betting",
    Revealing = "revealing",
    GameOver = "gameOver",
}

export type HandResult = 'win' | 'lose' | null;
export type GameOverReason = 'tile-min' | 'tile-max' | 'reshuffle' | null

export interface GameStateModel {
    drawPile: TileInstance[];
    discard: TileInstance[];
    hiddenHand: HandModel | null;
    visibleHand: HandModel | null;
    winStreak: number;
    currentScore: number;
    reshuffleCount: number;
    gamePhase: GamePhase;
    isPaused: boolean;
    lastResult: HandResult;
    gameOverReason: GameOverReason
    handSize: number // TODO: handle since added later
}