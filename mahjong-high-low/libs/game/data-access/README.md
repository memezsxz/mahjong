# Game Data Access

This project is the client-side state and persistence layer for the game. It should own the long-lived game store plus adapters to browser storage and backend APIs.

## This project should hold

- Signal stores, facades, and state transition entry points for gameplay.
- Persistence services for settings, scores, saved progress, and future HTTP clients.
- Browser-specific service wrappers such as audio, storage, and request coordination when they are shared across features.

## This project should not hold

- Route components, page layout, or screen orchestration. Those belong in `libs/game/feature`.
- Reusable presentational UI. That belongs in `libs/game/ui`.
- Pure domain rules and calculations. Those belong in `libs/shared/util-game`.
- Shared type definitions. Those belong in `libs/shared/models`.

## Split inside this project

- `+state`: owns canonical client state and state transitions.
- Service classes: own persistence or external side effects.
- Future HTTP or backend integrations for the game should start here rather than in feature components.
