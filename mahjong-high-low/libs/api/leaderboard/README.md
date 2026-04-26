# API Leaderboard

This project is the backend feature module for leaderboard behavior. It should contain everything needed to expose and persist leaderboard data behind a clean module boundary.

## This project should hold

- Nest controllers for leaderboard endpoints.
- Feature services that enforce leaderboard-specific business rules.
- Repositories, schemas, and persistence mapping for leaderboard storage.
- Validation and DTO-style contracts when the API needs stricter request boundaries.

## This project should not hold

- Global app bootstrap, database bootstrap, or cross-feature infrastructure. Those belong in `api`.
- Frontend storage logic or browser-only score handling. Those belong in `libs/game/data-access`.
- Shared domain types beyond importing contracts from `libs/shared/models`.

## Dependency role

- This library should be imported by the `api` app shell.
- Other backend features should not reach into its internal repository or schema files directly.
