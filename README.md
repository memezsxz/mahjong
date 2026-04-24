# High Low Mahjong

## planing
- maybe have two versions, one with services and one with NgRx -- two branches
- [ ] add testing to the ui
- [ ] have animation in the ui

## ai
- used claude for planing the project

```markdown
hand-betting-game/
│
├── apps/
│   ├── web/                          ← Angular shell
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.config.ts         ← PrimeNG + Router providers
│   │       ├── app.routes.ts         ← top-level routes (lazy loads feature lib)
│   │       └── app.component.ts      ← root, just a <router-outlet>
│   │
│   └── api/                          ← NestJS shell
│       └── src/
│           ├── main.ts
│           └── app.module.ts         ← imports LeaderboardModule from libs
│
├── libs/
│   │
│   ├── shared/
│   │   │
│   │   ├── models/                   ← [util] interfaces, enums, DTOs
│   │   │   └── src/
│   │   │       ├── lib/
│   │   │       │   ├── tile.model.ts
│   │   │       │   ├── hand.model.ts
│   │   │       │   ├── game-state.model.ts
│   │   │       │   ├── score.model.ts
│   │   │       │   ├── leaderboard-entry.model.ts
│   │   │       │   ├── bet.model.ts
│   │   │       │   └── player-settings.model.ts
│   │   │       └── index.ts
│   │   │
│   │   └── util-game/                ← [util] pure functions, zero framework code
│   │       └── src/
│   │           ├── lib/
│   │           │   ├── deck.utils.ts           ← build, shuffle, draw, reshuffle
│   │           │   ├── tile-value.utils.ts     ← dynamic scaling per tile
│   │           │   ├── hand-evaluator.utils.ts ← hand total, win/loss result
│   │           │   ├── game-over.utils.ts      ← all 3 game-over condition checks
│   │           │   └── score.utils.ts          ← score calculation
│   │           └── index.ts
│   │
│   ├── game/
│   │   │
│   │   ├── data-access/              ← [data-access] state + HTTP + settings
│   │   │   └── src/
│   │   │       ├── lib/
│   │   │       │   ├── +state/
│   │   │       │   │   ├── game.store.ts        ← NgRx Component Store (single source of truth)
│   │   │       │   │   └── game.store.spec.ts
│   │   │       │   ├── leaderboard.service.ts   ← HTTP calls to NestJS API
│   │   │       │   ├── settings.service.ts      ← persist player settings (localStorage)
│   │   │       │   └── first-time.service.ts    ← detects first play, triggers guide
│   │   │       └── index.ts
│   │   │
│   │   ├── feature/                  ← [feature] all page-level smart components
│   │   │   └── src/
│   │   │       ├── lib/
│   │   │       │   ├── landing/
│   │   │       │   │   ├── landing-page.component.ts    ← New Game + leaderboard
│   │   │       │   │   └── landing-page.component.html
│   │   │       │   │
│   │   │       │   ├── game/
│   │   │       │   │   ├── game-page.component.ts       ← main game screen (smart)
│   │   │       │   │   └── game-page.component.html
│   │   │       │   │
│   │   │       │   ├── game-over/
│   │   │       │   │   ├── game-over-page.component.ts  ← final score + submit
│   │   │       │   │   └── game-over-page.component.html
│   │   │       │   │
│   │   │       │   ├── settings/
│   │   │       │   │   ├── settings-page.component.ts   ← sound, animations, theme
│   │   │       │   │   └── settings-page.component.html
│   │   │       │   │
│   │   │       │   └── guide/
│   │   │       │       ├── guide-page.component.ts      ← standalone full guide
│   │   │       │       ├── guide-page.component.html
│   │   │       │       ├── guide-overlay.component.ts   ← in-game first-time overlay
│   │   │       │       └── guide-overlay.component.html
│   │   │       │
│   │   │       ├── game-feature.routes.ts       ← all routes for this lib
│   │   │       └── index.ts
│   │   │
│   │   └── ui/                       ← [ui] dumb presentational components only
│   │       └── src/
│   │           ├── lib/
│   │           │   ├── tile/
│   │           │   │   ├── tile.component.ts            ← renders one tile visually
│   │           │   │   └── tile.component.html
│   │           │   │
│   │           │   ├── hand/
│   │           │   │   ├── hand.component.ts            ← current hand of tiles
│   │           │   │   └── hand.component.html
│   │           │   │
│   │           │   ├── hand-history/
│   │           │   │   ├── hand-history.component.ts    ← previous hand (small + value)
│   │           │   │   └── hand-history.component.html
│   │           │   │
│   │           │   ├── deck-counter/
│   │           │   │   ├── deck-counter.component.ts    ← draw pile + discard counts
│   │           │   │   └── deck-counter.component.html
│   │           │   │
│   │           │   ├── bet-controls/
│   │           │   │   ├── bet-controls.component.ts    ← Bet Higher / Bet Lower
│   │           │   │   └── bet-controls.component.html
│   │           │   │
│   │           │   ├── score-display/
│   │           │   │   ├── score-display.component.ts   ← current score badge
│   │           │   │   └── score-display.component.html
│   │           │   │
│   │           │   ├── leaderboard-table/
│   │           │   │   ├── leaderboard-table.component.ts  ← top 5 display
│   │           │   │   └── leaderboard-table.component.html
│   │           │   │
│   │           │   ├── pause-menu/
│   │           │   │   ├── pause-menu.component.ts      ← resume/settings/exit overlay
│   │           │   │   └── pause-menu.component.html
│   │           │   │
│   │           │   └── result-banner/
│   │           │       ├── result-banner.component.ts   ← win/loss animation banner
│   │           │       └── result-banner.component.html
│   │           └── index.ts
│   │
│   └── api/
│       └── leaderboard/              ← single NestJS lib (module + service + MongoDB)
│           └── src/
│               ├── lib/
│               │   ├── leaderboard.module.ts
│               │   ├── leaderboard.controller.ts   ← GET /leaderboard, POST /leaderboard
│               │   ├── leaderboard.service.ts      ← top 5 filter logic
│               │   ├── leaderboard.repository.ts   ← Mongoose queries
│               │   └── leaderboard.schema.ts       ← Mongoose schema
│               └── index.ts
│
├── nx.json
├── tsconfig.base.json                ← path aliases (@hbg/shared/models, etc.)
└── package.json
```
## me
why i choose:  Which unit test runner would you like to use? · vitest-angular
why i choose:   Which bundler do you want to use to build the application · esbuild
why i choose:   Do you want to enable Server-Side Rendering (SSR) and Static Site Generation (SSG/Prerendering)? (y/N) · false
why i choose:   Which linter would you like to use? · eslint
