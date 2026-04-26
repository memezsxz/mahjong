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
