import { Bet } from './bet.model.js';
import { HandResult } from './game-state.model.js';

export interface HandHistoryItem {
  round:       number;
  bet:         Bet;
  result:      HandResult;
  scoreChange: number;
}