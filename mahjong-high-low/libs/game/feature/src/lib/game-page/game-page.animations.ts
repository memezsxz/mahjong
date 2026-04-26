import { HandSizeOptions } from '@hbg/shared-models';

export const TILE_DEAL_STAGGER_MS = 65;
export const TILE_DEAL_DURATION_MS = 400;
export const HIDDEN_HAND_GAP_MS = -200;
export const BET_CONTROLS_BUFFER_MS = 80;
export const NEXT_ROUND_VISIBLE_EXIT_MS = 260;
export const NEXT_ROUND_PROMOTE_DELAY_MS = 220;
export const NEXT_ROUND_PROMOTE_MS = 430;
export const NEXT_ROUND_INCOMING_HIDDEN_MS = 430;
export const NEXT_ROUND_INCOMING_HIDDEN_DELAY_MS = NEXT_ROUND_PROMOTE_DELAY_MS + NEXT_ROUND_PROMOTE_MS;
export const NEXT_ROUND_VISIBLE_TOTAL_ENTER_DELAY_MS = 520;
export const NEXT_ROUND_TRANSITION_TOTAL_MS = NEXT_ROUND_INCOMING_HIDDEN_DELAY_MS + NEXT_ROUND_INCOMING_HIDDEN_MS + 50;
export const WIN_BANNER_SHOW_MS = 1150;
export const WIN_VALUE_STEP_MS = 1000;
export const WIN_POST_VALUE_SETTLE_MS = 260;
export const HIDDEN_REVEAL_TILE_STEP_MS = 420;
export const HIDDEN_REVEAL_VALUE_DELAY_MS = 230;
export const HIDDEN_REVEAL_SETTLE_MS = 260;
export const HIDDEN_REVEAL_TOTAL_STEP_MS = 220;
export const HIDDEN_REVEAL_POST_TILE_MS = 180;
export const SCORE_GAIN_FLY_MS = 650;
export const SCORE_GAIN_SETTLE_MS = 260;

export function getSingleHandDealDuration(handSize: HandSizeOptions): number {
  return (handSize - 1) * TILE_DEAL_STAGGER_MS + TILE_DEAL_DURATION_MS;
}

export function getHiddenHandBaseDelay(handSize: HandSizeOptions): number {
  return getSingleHandDealDuration(handSize) + HIDDEN_HAND_GAP_MS;
}

export function getBetControlsDelay(handSize: HandSizeOptions): number {
  return getHiddenHandBaseDelay(handSize) + getSingleHandDealDuration(handSize) + BET_CONTROLS_BUFFER_MS;
}

export function getNextRoundBetControlsDelay(): number {
  return NEXT_ROUND_TRANSITION_TOTAL_MS - 400;
}
