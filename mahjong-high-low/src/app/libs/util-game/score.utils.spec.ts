import { HandModel } from '@hbg/shared-models';
import { calculateScore } from './score.utils';

describe('calculateScore', () => {
  const hand: HandModel = {
    total: 12,
    tiles: [],
  };

  it('caps the win streak multiplier at the configured maximum', () => {
    expect(calculateScore(hand, 30, 3, 'win')).toEqual({
      newWinStreak: 3,
      calculatedScore: 66,
    });
  });

  it('resets the streak and subtracts the hand total on losses', () => {
    expect(calculateScore(hand, 30, 2, 'lose')).toEqual({
      newWinStreak: 0,
      calculatedScore: 18,
    });
  });

  it('never lets a losing score drop below zero', () => {
    expect(calculateScore(hand, 5, 1, 'lose')).toEqual({
      newWinStreak: 0,
      calculatedScore: 0,
    });
  });
});
