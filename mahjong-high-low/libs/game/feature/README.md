# Game Feature

This project is the game flow layer. It should own route-facing containers such as the landing page and game page, and it should coordinate the other game libraries.

## This project should hold

- Page components and route definitions for the game experience.
- Orchestration logic that combines store state, UI components, audio, leaderboard actions, and transition sequences.
- Feature-scoped facades or helper services that only make sense for a full page or flow.

## This project should not hold

- Reusable visual components that can be rendered outside a page context. Those belong in `libs/game/ui`.
- Core scoring rules, deck rules, hand evaluation, or other deterministic game logic. Those belong in `libs/shared/util-game`.
- Shared domain types. Those belong in `libs/shared/models`.
- Long-term persistence, browser storage, API clients, or core game state containers. Those belong in `libs/game/data-access`.

## Dependency role

- May depend on `game/ui`, `game/data-access`, `shared/models`, and `shared/util-game`.
- Should be the highest-level game library that the `web` app imports.
