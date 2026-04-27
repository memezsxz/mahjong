import { Bet } from './bet.model.js';
import { HandResult } from './game-state.model.js';
import { HandModel } from './hand.model.js';

export interface HandHistoryItem {
  round: number;
  bet: Bet;
  result: HandResult;
  scoreChange: number;
  // These are recorded snapshots for the sidebar/history view, not live hand references.
  visibleHand?: HandModel;
  hiddenHand?: HandModel;
}
