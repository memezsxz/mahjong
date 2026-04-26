# Shared Models

This project is the contract layer shared by frontend and backend. It should define the shapes of the data, but not the behavior of the system.

## This project should hold

- TypeScript interfaces, types, enums, and plain domain models.
- Request and response payload contracts shared between the Angular app and Nest API.
- Stable domain vocabulary such as hands, tiles, bets, game phases, settings, and leaderboard entries.

## This project should not hold

- Functions with business rules or calculations. Those belong in `libs/shared/util-game`.
- Angular services, Nest providers, browser APIs, or persistence code.
- View-specific formatting or UI-only state.

## Boundary note

- Everything here should be portable and side-effect free so both app and API can depend on it safely.

## Internal structure

- `src/lib/tile.model.ts`
  - tile vocabulary and the distinction between static tile definitions vs runtime tile instances.
- `src/lib/hand.model.ts` and `src/lib/bet.model.ts`
  - small gameplay contracts used by both the rules layer and feature state.
- `src/lib/game-state.model.ts` and `src/lib/hand-history-item.model.ts`
  - client-facing game lifecycle and recorded round snapshot shapes.
- `src/lib/leaderboard-entry.model.ts` and `src/lib/player-settings.model.ts`
  - shared API/browser payload contracts for scores and settings.

## Dependency rules

- Consumers may import contracts from here, but they should not add behavior back into this package.
- Defaults, invariants, and calculations belong in `libs/shared/util-game` or feature-specific layers, not here.
- If transport contracts ever diverge from app-facing models, add explicit backend/frontend DTO shapes rather than overloading one shared type silently.
