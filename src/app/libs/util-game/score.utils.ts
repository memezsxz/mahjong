import { HandModel, HandResult } from '@hbg/shared-models';
import { MAX_WIN_STREAK } from './game.config.js';

/**
 * Calculates the next score and streak after resolving a hand result.
 *
 * Wins increase the streak up to `MAX_WIN_STREAK` and add the hand total
 * multiplied by the resulting streak. Losses reset the streak and subtract the
 * hand total without allowing the score to drop below zero.
 */
export function calculateScore(
  hand: HandModel,
  totalScore: number,
  winStreak: number,
  handResult: HandResult,
): {
  newWinStreak: number;
  calculatedScore: number;
} {
  let calculatedScore = totalScore;
  let newWinStreak = winStreak;

  if (handResult === null) return { newWinStreak, calculatedScore };

  if (handResult === 'win') {
    newWinStreak = Math.min(newWinStreak + 1, MAX_WIN_STREAK);
    calculatedScore += hand.total * newWinStreak;
  } else {
    newWinStreak = 0;
    calculatedScore = Math.max(0, calculatedScore - hand.total);
  }

  return { newWinStreak, calculatedScore };
}
