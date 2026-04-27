# Mahjong High-Low

> Note: AI was used as a development aid during this project, mainly for iteration support, small implementation help, and refinement. The one area that was heavily AI-assisted end-to-end was the game animation work. The rest of the application, including the overall structure, gameplay logic, styling direction, and feature development, was primarily implemented by me with occasional AI support where useful.

Mahjong High-Low is a single-page Angular game where the player sees one Mahjong hand, guesses whether the hidden hand is higher or lower, and advances through animated deal, reveal, scoring, and reshuffle flows. The project is structured around reusable game logic, UI components, and feature services for audio, transitions, score handling, and player settings. The interface is responsive and adapts for mobile layouts as well as desktop play.

## Live

- **Game:** https://memezsxz.github.io/mahjong/
- **Docs:** https://memezsxz.github.io/mahjong/docs

## Gameplay Loop

The player starts on the landing page, where they can begin a run immediately, review the basic rules, open the settings panel, and view the top-scores table. Once the game starts, the visible and hidden hands are dealt, the player chooses Higher or Lower, and the hidden hand is revealed through the animated round flow while the score, deck stats, and hand history update in the sidebar.

The run continues hand by hand until a tile reaches `0` or `10`, or the reshuffle limit is exceeded. The current configuration allows `1` reshuffle. When the run ends, the player sees the final score and can name the run if it qualifies for the leaderboard. Exiting an active run does not offer score saving.

## Project Stack

- Angular `21.2.x` is the application framework used to build the SPA, routing, component structure, templates, dependency injection, and app lifecycle.
- NgRx Signals and Component Store are used for reactive local state and game-facing state management patterns.- PrimeNG provides ready-made UI components such as buttons, while `primeicons` provides the icon set used by those components.
- PrimeNG provides ready-made UI components such as buttons, while `primeicons` provides the icon set used by those components.
- `@primeng/themes`, `@primeuix/themes`, and `tailwindcss-primeui` support PrimeNG theming and make PrimeNG components fit the project’s visual system.
- Tailwind CSS 4 is used for utility-first styling and layout throughout templates and feature screens.
- TypeScript powers the application code, shared models, utility layers, and typed state/configuration.
- Angular Service Worker caches tile image assets and app resources, so repeat visits load instantly and the app remains functional offline.
- Karma and Jasmine are used for unit testing.
- Compodoc is used for documentation generation through the `docs` script: `npm run docs`.

## Development

Start the local development server with:

```bash
ng serve
```

Then open `http://localhost:4200/`.

## Build

Build the project with:

```bash
ng build
```

## Test

Run unit tests with:

```bash
ng test
```

## Documentation

Generate project documentation with:

```bash
npm run docs
```

Note: the repo already has a `docs` script configured for Compodoc. If Compodoc is not available in your environment, add/install it before running the command.

## App Structure

```text
src/app
├── features/      # contains route-level features and page logic
└── libs/          # contains shared libraries used across features
    ├── data-access/   # contains state, storage, and app services
    ├── models/        # contains shared TypeScript models
    ├── ui/            # contains reusable UI components and UI helpers
    └── util-game/     # contains game rules, config, and pure utilities
```

## Constants Inventory

- [src/app/libs/util-game/game.config.ts](./src/app/libs/util-game/game.config.ts) holds core game-rule constants such as tile values, reshuffle limits, win-streak caps, valid hand sizes, and the default hand size.
- [src/app/features/game-page/game-page.animations.ts](./src/app/features/game-page/game-page.animations.ts) holds game-page timing constants for dealing, reveal flow, transitions, score gain, and reshuffle sequencing.
- [src/app/libs/ui/game-ui.animations.ts](./src/app/libs/ui/game-ui.animations.ts) holds shared UI animation constants used by tiles, hands, deck counters, and score-display components.
- [src/app/libs/data-access/game-audio-manager.service.ts](./src/app/libs/data-access/game-audio-manager.service.ts) holds audio constants for sound file locations, music/effect sources, and playback volumes.
- [src/app/libs/data-access/scores.service.ts](./src/app/libs/data-access/scores.service.ts) holds leaderboard constants such as `MAX_SCORES = 5` and the score storage key.
- [src/app/libs/data-access/settings.service.ts](./src/app/libs/data-access/settings.service.ts) holds player-settings persistence constants and now reads valid hand sizes from the centralized game config.
- [src/app/features/game-page/game-page-ui-shell.service.ts](./src/app/features/game-page/game-page-ui-shell.service.ts) holds UI-flow constants such as `MAX_RUN_NAME_LENGTH = 10`.
- [src/app/libs/ui/tile-asset-path.ts](./src/app/libs/ui/tile-asset-path.ts) holds tile asset path constants such as `TILE_ASSET_DIRECTORY` and `TILE_ASSET_EXTENSION`.
- [src/app/libs/ui/settings-panel/settings-panel.ts](./src/app/libs/ui/settings-panel/settings-panel.ts) exposes the centralized hand-size options for the settings UI.
