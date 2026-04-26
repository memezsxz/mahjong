# Web App

This project is the Angular application shell. It should stay thin and focus on bootstrapping the client application around the game feature libraries.

## This project should hold

- Angular bootstrap code, top-level router setup, and app-wide provider registration.
- Static assets, environment wiring, and application-wide styles.
- Cross-feature shell concerns such as proxy configuration or future app-level guards.

## This project should not hold

- Core game pages, reusable game widgets, or game state logic. Those belong in the game libraries under `libs/game`.
- Shared game rules or domain models. Those belong in `libs/shared`.
- Backend logic or persistence behavior beyond calling into feature libraries.

## Dependency role

- Import high-level feature libraries, not deep internal files.
- Treat this app as the composition root for the frontend, not as the place where game behavior is implemented.
