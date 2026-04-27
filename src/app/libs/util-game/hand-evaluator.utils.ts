import { Bet, HandModel, HandResult, TileInstance } from '@hbg/shared-models';

/**
 * Calculates the total current value of a hand from its tiles.
 */
export function calculateHandTotal(hand: TileInstance[]) {
  return hand.reduce((a, b) => a + b.currentValue, 0);
}

/**
 * Resolves whether the player's Higher/Lower bet wins against the revealed hand.
 */
export function evaluateBet(oldHand: HandModel, newHand: HandModel, bet: Bet): HandResult {
  if (bet == Bet.High && oldHand.total < newHand.total) return 'win';
  if (bet == Bet.Low && oldHand.total > newHand.total) return 'win';
  return 'lose';
}
