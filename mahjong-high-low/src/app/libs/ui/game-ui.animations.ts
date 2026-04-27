/**
 * Shared UI animation timing configuration.
 *
 * Sequence overview in the game page:
 * 1. Hand deal presentation:
 *    - Each tile uses `UI_TILE_DEAL_DURATION_MS` for its deal motion.
 *    - Consecutive tiles are offset by `UI_TILE_DEAL_STAGGER_MS`.
 *
 * 2. Hidden-hand reveal:
 *    - Each tile flip uses `UI_TILE_REVEAL_FLIP_DURATION_MS`.
 *    - When a tile's numeric value changes, the value roll uses
 *      `UI_TILE_VALUE_ROLL_DURATION_MS`.
 *
 * 3. Hand total updates:
 *    - Rolling total changes in a hand use `UI_HAND_TOTAL_ROLL_DURATION_MS`.
 *
 * 4. Sidebar counters:
 *    - Deck and discard count roll updates use `UI_DECK_COUNTER_ROLL_DURATION_MS`.
 *    - Incremental score stepping uses `UI_SCORE_STEP_MS`.
 *    - The stepped score sound uses `UI_SCORE_STEP_SOUND_TAIL_PADDING_MS` when
 *      trimming the playback tail.
 *
 * These values are shared by the reusable UI components under `libs/ui` rather
 * than by the game-page orchestration services directly.
 */

/** Duration of a tile deal animation in shared UI components. */
export const UI_TILE_DEAL_DURATION_MS = 520;
/** Stagger between tile deal animations in shared UI components. */
export const UI_TILE_DEAL_STAGGER_MS = 65;
/** Duration of the tile flip animation used during reveal. */
export const UI_TILE_REVEAL_FLIP_DURATION_MS = 520;
/** Duration of the tile-value rolling animation. */
export const UI_TILE_VALUE_ROLL_DURATION_MS = 700;
/** Duration of the hand-total rolling animation. */
export const UI_HAND_TOTAL_ROLL_DURATION_MS = 700;
/** Duration of the deck/discard counter roll animation. */
export const UI_DECK_COUNTER_ROLL_DURATION_MS = 420;
/** Step interval used by incremental score display changes. */
export const UI_SCORE_STEP_MS = 70;
/** Tail padding used when trimming the score-step sound effect. */
export const UI_SCORE_STEP_SOUND_TAIL_PADDING_MS = 35;
