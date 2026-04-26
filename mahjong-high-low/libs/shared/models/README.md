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
