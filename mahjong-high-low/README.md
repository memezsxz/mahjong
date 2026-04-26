# Mahjong High Low Workspace

This workspace is split by responsibility, not by screen or by technical convenience.

## Project map

- `web`: the Angular application shell. It should bootstrap the app, own app-level routing, register global providers, and host static assets.
- `api`: the Nest application shell. It should bootstrap the backend, wire infrastructure, and compose feature modules.
- `libs/game/feature`: game flows and page-level orchestration. It should compose UI pieces, coordinate state, and own route-facing containers.
- `libs/game/ui`: reusable presentational components for the game. It should render inputs and emit outputs, with as little business logic as possible.
- `libs/game/data-access`: client-side state and persistence adapters. It should own stores, browser storage, API clients, and service facades used by features.
- `libs/api/leaderboard`: backend leaderboard feature. It should own leaderboard routes, service logic, and persistence details.
- `libs/shared/models`: shared contracts and domain shapes. It should only define types, enums, and plain data models shared across app and API.
- `libs/shared/util-game`: shared pure game rules and calculations. It should contain deterministic logic that can run in any environment.

## Dependency direction

- `web` -> `game/feature`
- `game/feature` -> `game/ui`, `game/data-access`, `shared/models`, `shared/util-game`
- `game/ui` -> `shared/models`, `shared/util-game`
- `game/data-access` -> `shared/models`, `shared/util-game`
- `api` -> `api/leaderboard`, `shared/models`
- `api/leaderboard` -> `shared/models`

## Boundary rules

- Shared libraries must not depend on Angular app shells, Nest app shells, DOM globals, or browser storage.
- `game/ui` should not own app state, routing, local storage, or backend decisions.
- `game/feature` should not become a dumping ground for reusable primitives; if something is reusable, move it down to `ui`, `data-access`, or `shared`.
- `data-access` should not hold page layout code or animation orchestration.
- `api` should stay thin; backend feature code belongs in feature libraries, not in the app shell.
