# TempAngular

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.6.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Constants Inventory

- [src/app/libs/util-game/game.config.ts](./src/app/libs/util-game/game.config.ts) holds core game-rule constants such as tile values, reshuffle limits, win-streak caps, valid hand sizes, and the default hand size.
- [src/app/features/game-page/game-page.animations.ts](./src/app/features/game-page/game-page.animations.ts) holds game-page timing constants for dealing, reveal flow, transitions, score gain, and reshuffle sequencing.
- [src/app/libs/ui/game-ui.animations.ts](./src/app/libs/ui/game-ui.animations.ts) holds shared UI animation constants used by tiles, hands, deck counters, and score-display components.
- [src/app/libs/data-access/game-audio-manager.service.ts](./src/app/libs/data-access/game-audio-manager.service.ts) holds audio constants for sound file locations, music/effect sources, and playback volumes.
- [src/app/libs/data-access/scores.service.ts](./src/app/libs/data-access/scores.service.ts) holds leaderboard constants such as `MAX_SCORES = 5` and the score storage key.
- [src/app/libs/data-access/settings.service.ts](./src/app/libs/data-access/settings.service.ts) holds player-settings persistence constants and now reads valid hand sizes from the centralized game config.
- [src/app/features/game-page/game-page-ui-shell.service.ts](./src/app/features/game-page/game-page-ui-shell.service.ts) holds UI-flow constants such as `MAX_RUN_NAME_LENGTH = 10`.
- [src/app/features/game-feature.policy.ts](./src/app/features/game-feature.policy.ts) holds feature-policy constants such as `ALLOW_SCORE_SAVE_ON_EXIT = true`.
- [src/app/features/game-page/game-page.ts](./src/app/features/game-page/game-page.ts) holds page-level debug constants such as `DEBUG_MODE = true`.
- [src/app/libs/ui/tile-asset-path.ts](./src/app/libs/ui/tile-asset-path.ts) holds tile asset path constants such as `TILE_ASSET_DIRECTORY` and `TILE_ASSET_EXTENSION`.
- [src/app/libs/ui/settings-panel/settings-panel.ts](./src/app/libs/ui/settings-panel/settings-panel.ts) exposes the centralized hand-size options for the settings UI.
