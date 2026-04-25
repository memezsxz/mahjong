# Gameplay Animation Plan

## Goal
Keep gameplay animation maintainable as the page grows from simple hand dealing into full sequence-driven presentation.

## Why This Needs Structure
The planned animation work is not just visual polish. It includes:

- multi-step sequences
- different flows for initial deal, next hand, win, loss, reshuffle, and game over
- coordination between main board, score, streak, sidebar, and overlays
- gating player actions until presentation sequences finish
- value and score count-up animations

If this logic stays inside `game-page.ts` as scattered signals, booleans, and `setTimeout` calls, the page will become brittle quickly.

## Recommended Architecture
Use three layers:

1. Animation orchestration in TypeScript
2. Visual motion in CSS
3. Reusable animated primitives in UI components

## TypeScript Responsibilities
Create a dedicated animation layer next to the game page.

- `game-page.animations.ts`
  Holds animation phase names, timing constants, and helper functions.
- `game-page.animation-controller.ts`
  Owns sequence flow for the page. This can start as a plain helper or small injectable service.
- `game-page.ts`
  Stays focused on game state, user actions, and asking the animation layer what the UI should currently show.

Important rule:

- `GamePhase` should remain game logic state.
- gameplay animation should use separate UI animation phases.

Suggested UI animation phases:

- `dealing-initial`
- `dealing-next-round`
- `awaiting-bet`
- `revealing`
- `evaluating-win`
- `evaluating-loss`
- `transferring-score`
- `transitioning-hand`
- `reshuffling`
- `game-over-intro`
- `game-over-stats`
- `game-over-actions`

## CSS Responsibilities
Split gameplay CSS by concern instead of keeping all keyframes in one file.

Suggested structure:

- `game-page.layout.css`
- `game-page.deal.css`
- `game-page.reveal.css`
- `game-page.score.css`
- `game-page.game-over.css`

Guideline:

- CSS should define motion and styling.
- CSS should not decide sequence flow.

## Component Responsibilities
Push DOM-specific animation behavior into the component that owns the DOM.

Recommended component boundaries:

- `lib-hand`
  Deals tiles, coordinates hand-level move transitions.
- `lib-tile`
  Handles flip, per-tile value changes, and tile enter or exit motion.
- `lib-result-banner`
  Big result words like `WIN`, `LOSE`, `WASTED`.
- `lib-score-transfer`
  Handles hand total moving into score and streak multiplier presentation.
- `lib-sidebar-stats-transition`
  Handles sidebar stats moving into the center during game over.

## Sequencing Rule
Prefer event-driven sequencing over guessed delays.

Use:

- emitted completion events from components
- explicit phase transitions
- fixed delays only for intentional dramatic pauses

Avoid using a timeout to guess when an animation probably ended if the component can report completion.

## Delivery Order
Build the animation system in this order:

1. Animation infrastructure
2. Deal and next-hand transition
3. One-by-one tile reveal flip
4. Win or loss banner
5. Tile value and hand-total count-up
6. Score transfer and streak animation
7. Reshuffle sequence
8. Game-over takeover animation

## Immediate Refactor Rule For This Repo
Start moving gameplay animation details out of `game-page.ts` now.

Current baseline:

- move timing constants and helper logic into `game-page.animations.ts`
- split `game-page.css` into dedicated files via `styleUrls`
- keep `game-page.ts` responsible for orchestration only

This gives a stable base before implementing the heavier animation tasks.
