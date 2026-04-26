import { Bet } from './bet.model.js';
import { HandResult } from './game-state.model.js';
import { HandModel } from './hand.model.js';

export interface HandHistoryItem {
  round:       number;
  bet:         Bet;
  result:      HandResult;
  scoreChange: number;
  visibleHand?: HandModel;
  hiddenHand?: HandModel;
}
