# Shared Game Utils

This project is the pure rules engine for the game. It should encode deterministic game behavior that can be reused by any consumer.

## This project should hold

- Deck creation, draw, reshuffle, scoring, hand evaluation, and game-over calculations.
- Constants and configuration values that define the rules of the game.
- Pure helper functions that transform domain models without touching framework or runtime state.

## This project should not hold

- Shared type declarations. Those belong in `libs/shared/models`.
- Angular components, stores, services, or browser APIs.
- Nest controllers, repositories, or persistence concerns.
- Page timing, route flow, or UI orchestration.

## Boundary note

- Keep this library deterministic and side-effect free so it can remain the single source of truth for game rules.

## Internal structure

- `src/lib/deck.utils.ts`
  - deck composition, draw, shuffle, and reshuffle behavior.
- `src/lib/hand-evaluator.utils.ts` and `src/lib/score.utils.ts`
  - hand-total evaluation, bet resolution, and score progression.
- `src/lib/tile-value.utils.ts` and `src/lib/game-over.utils.ts`
  - honor-tile scaling and terminal rule checks.
- `src/lib/game.config.ts`
  - gameplay constants only, not app-policy or asset-path concerns.

## Determinism note

- Functions here must stay free of framework/runtime side effects.
- Randomness is allowed only where the game rules require shuffling, and the randomness boundary should stay explicit in the deck utilities.
- Reshuffle ID suffixing is a local identity strategy so repeated deck rebuilds do not recreate duplicate tile instance IDs within a running session.

## Dependency rules

- This library may depend on `libs/shared/models` only.
- UI asset resolution, browser APIs, and feature workflow policy must stay out of this package.
- If a helper is pure but presentation-specific, that still does not make it a game rule; keep it with the presentation layer instead.
