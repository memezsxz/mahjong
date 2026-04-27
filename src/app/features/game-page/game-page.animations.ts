import { HandSizeOptions } from '@hbg/shared-models';

/**
 * Game page timing configuration.
 *
 * Sequence overview:
 * 1. Initial deal:
 *    - The visible hand deals first using `TILE_DEAL_STAGGER_MS` and `TILE_DEAL_DURATION_MS`.
 *    - The hidden hand starts after `HIDDEN_HAND_GAP_MS` through `getHiddenHandBaseDelay()`.
 *    - The first betting controls appear after `getBetControlsDelay()`, which includes
 *      `BET_CONTROLS_BUFFER_MS`.
 *
 * 2. Next-hand transition:
 *    - The outgoing visible hand exits over `NEXT_ROUND_VISIBLE_EXIT_MS`.
 *    - The promoted hand starts moving after `NEXT_ROUND_PROMOTE_DELAY_MS` and moves for
 *      `NEXT_ROUND_PROMOTE_MS`.
 *    - The next hidden hand enters after `NEXT_ROUND_INCOMING_HIDDEN_DELAY_MS` and animates for
 *      `NEXT_ROUND_INCOMING_HIDDEN_MS`.
 *    - The incoming visible total begins at `NEXT_ROUND_VISIBLE_TOTAL_ENTER_DELAY_MS`.
 *    - Transition cleanup completes at `NEXT_ROUND_TRANSITION_TOTAL_MS`, with
 *      `TRANSITION_FINISH_BUFFER_MS` used as the final safety buffer.
 *    - Later-round betting controls are re-enabled immediately after transition completion plus
 *      `BET_CONTROLS_BUFFER_MS`.
 *
 * 3. Hidden-hand reveal:
 *    - Each tile reveal steps by `HIDDEN_REVEAL_TILE_STEP_MS`.
 *    - Tile values appear after `HIDDEN_REVEAL_VALUE_DELAY_MS`.
 *    - Running total updates step by `HIDDEN_REVEAL_TOTAL_STEP_MS`.
 *    - Per-tile padding uses `HIDDEN_REVEAL_POST_TILE_MS`.
 *    - The reveal sequence settles after `HIDDEN_REVEAL_SETTLE_MS`.
 *
 * 4. Win/lose result flow:
 *    - The result banner shows for `WIN_BANNER_SHOW_MS`.
 *    - Win value changes use `WIN_PRE_VALUE_DELAY_MS`, `WIN_VALUE_STEP_MS`, and
 *      `WIN_POST_VALUE_SETTLE_MS`.
 *    - Non-animated result fallback uses `WIN_NO_ANIMATION_RESULT_PAUSE_MS`.
 *
 * 5. Score gain:
 *    - Score travel uses `SCORE_GAIN_FLY_MS`.
 *    - Score settle uses `SCORE_GAIN_SETTLE_MS`.
 *
 * 6. Reshuffle presentation:
 *    - Count transfer steps use `RESHUFFLE_STEP_MS`.
 *    - Mid-sequence spacing uses `RESHUFFLE_MID_GAP_MS`.
 *    - Reshuffle settle uses `RESHUFFLE_SETTLE_MS`.
 *    - Overlay exit uses `RESHUFFLE_EXIT_MS`.
 */
/** Delay between consecutive tile deal animations within a hand. */
export const TILE_DEAL_STAGGER_MS = 65;
/** Duration of a single tile deal animation. */
export const TILE_DEAL_DURATION_MS = 520;
/** Offset between visible-hand and hidden-hand deal timing. */
export const HIDDEN_HAND_GAP_MS = -200;
/** Small buffer before bet controls appear after deal timing completes. */
export const BET_CONTROLS_BUFFER_MS = 100;
/** Duration of the outgoing visible-hand exit motion. */
export const NEXT_ROUND_VISIBLE_EXIT_MS = 260;
/** Delay before the promoted hand starts moving into the visible slot. */
export const NEXT_ROUND_PROMOTE_DELAY_MS = 220;
/** Duration of the promoted-hand move into the visible slot. */
export const NEXT_ROUND_PROMOTE_MS = 430;
/** Duration of the incoming hidden-hand entrance motion. */
export const NEXT_ROUND_INCOMING_HIDDEN_MS = 430;
/** Delay before the incoming hidden hand begins entering. */
export const NEXT_ROUND_INCOMING_HIDDEN_DELAY_MS =
  NEXT_ROUND_PROMOTE_DELAY_MS + NEXT_ROUND_PROMOTE_MS;
/** Delay before the incoming visible total animates in. */
export const NEXT_ROUND_VISIBLE_TOTAL_ENTER_DELAY_MS = 520;
/** Total duration of the standard next-round transition sequence. */
export const NEXT_ROUND_TRANSITION_TOTAL_MS =
  NEXT_ROUND_INCOMING_HIDDEN_DELAY_MS + NEXT_ROUND_INCOMING_HIDDEN_MS + 50;
/** Time the win/lose banner remains visible before the next reveal step. */
export const WIN_BANNER_SHOW_MS = 1150;
/** Delay before post-reveal value updates begin on a win. */
export const WIN_PRE_VALUE_DELAY_MS = 1000;
/** Pause used when the result flow completes without the full animation path. */
export const WIN_NO_ANIMATION_RESULT_PAUSE_MS = 1000;
/** Step interval for win-related value updates. */
export const WIN_VALUE_STEP_MS = 1000;
/** Settle time after win-related value updates finish. */
export const WIN_POST_VALUE_SETTLE_MS = 260;
/** Step interval between hidden-hand tile reveals. */
export const HIDDEN_REVEAL_TILE_STEP_MS = 420;
/** Delay between flipping a hidden tile and showing its value. */
export const HIDDEN_REVEAL_VALUE_DELAY_MS = 230;
/** Settle time after the hidden hand is fully revealed. */
export const HIDDEN_REVEAL_SETTLE_MS = 260;
/** Delay between each hidden-hand running-total update. */
export const HIDDEN_REVEAL_TOTAL_STEP_MS = 220;
/** Post-tile padding after a hidden tile reveal completes. */
export const HIDDEN_REVEAL_POST_TILE_MS = 180;
/** Duration of the score-gain travel animation. */
export const SCORE_GAIN_FLY_MS = 650;
/** Settle time after the score-gain travel animation ends. */
export const SCORE_GAIN_SETTLE_MS = 260;
/** Small buffer added before transition cleanup. */
export const TRANSITION_FINISH_BUFFER_MS = 30;
/** Buffer added after reveal-promotion movement before cleanup. */
export const REVEAL_PROMOTION_FINISH_BUFFER_MS = 30;
/** Tick interval used by the reshuffle presentation sequence. */
export const RESHUFFLE_STEP_MS = 220;
/** Gap between the reshuffle count-transfer phases. */
export const RESHUFFLE_MID_GAP_MS = 240;
/** Settle time after reshuffle counts finish animating. */
export const RESHUFFLE_SETTLE_MS = 420;
/** Duration of the reshuffle overlay exit motion. */
export const RESHUFFLE_EXIT_MS = 320;

/** Calculates the full duration of a single hand deal for the selected hand size. */
export function getSingleHandDealDuration(handSize: HandSizeOptions): number {
  return (handSize - 1) * TILE_DEAL_STAGGER_MS + TILE_DEAL_DURATION_MS;
}

/** Calculates when the hidden hand should begin its deal sequence. */
export function getHiddenHandBaseDelay(handSize: HandSizeOptions): number {
  return getSingleHandDealDuration(handSize) + HIDDEN_HAND_GAP_MS;
}

/** Calculates when bet controls should appear for the initial deal. */
export function getBetControlsDelay(handSize: HandSizeOptions): number {
  return (
    getHiddenHandBaseDelay(handSize) + getSingleHandDealDuration(handSize) + BET_CONTROLS_BUFFER_MS
  );
}

/** Returns the fallback timed buffer for later-round bet controls. */
export function getNextRoundBetControlsDelay(): number {
  return BET_CONTROLS_BUFFER_MS;
}
