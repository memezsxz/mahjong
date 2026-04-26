import { TileInstance } from './tile.model.js';
import { HandModel } from './hand.model.js';
import { HandSizeOptions } from './player-settings.model.js';
import { HandHistoryItem } from './hand-history-item.model.js';

export enum GamePhase {
  Idle = 'idle',
  Betting = 'betting',
  Revealing = 'revealing',
  GameOver = 'gameOver',
}

// `HandResult` is the per-round reveal outcome, while `GameOverReason` is the terminal condition for the whole run.
export type HandResult = 'win' | 'lose' | null;
export type GameOverReason = 'tile-min' | 'tile-max' | 'reshuffle' | null;

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
  lastScoreChange: number | null;
  gameOverReason: GameOverReason;
  handSize: HandSizeOptions;
  handHistory: HandHistoryItem[];
}
