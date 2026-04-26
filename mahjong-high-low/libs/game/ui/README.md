# Game UI

This project is the reusable presentation layer for the game. It should render tiles, hands, controls, panels, and visual states without owning the game flow.

## This project should hold

- Standalone Angular UI components that accept inputs and emit outputs.
- Styling, templates, and small UI-only interaction logic needed to render a component well.
- UI-only animation helpers, tokens, and view formatting that do not change the game rules.

## This project should not hold

- Routing, page composition, or cross-component flow control. Those belong in `libs/game/feature`.
- Game state ownership, local storage, leaderboard persistence, or API access. Those belong in `libs/game/data-access`.
- Domain rules such as score calculation, deck reshuffling, or hand evaluation. Those belong in `libs/shared/util-game`.
- Shared contracts or enums. Those belong in `libs/shared/models`.

## Boundary note

- This library should stay mostly stateless. When a component needs something from outside, prefer inputs and outputs over direct access to app services.
