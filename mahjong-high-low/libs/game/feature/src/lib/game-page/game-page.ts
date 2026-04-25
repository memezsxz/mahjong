import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import {
  Hand,
  BetControls,
  ScoreDisplay,
  DeckCounter,
  HandHistory,
  PauseMenu,
  SettingsPanel,
  HandHistoryItem,
} from '@hbg/game-ui';
import {
  TileType,
  NumberSuit,
  DragonSuit,
  WindSuit,
  HandModel,
  PlayerSettingsModel,
} from '@hbg/shared-models';

@Component({
  selector: 'lib-game-page',
  imports: [
    Hand,
    BetControls,
    ScoreDisplay,
    DeckCounter,
    HandHistory,
    PauseMenu,
    SettingsPanel,
    ButtonModule,
  ],
  templateUrl: './game-page.html',
  styleUrl: './game-page.css',
})
export class GamePage {
  constructor(private router: Router) {}

  // ── Overlay state ─────────────────────────────────────────────────────
  pauseOpen     = signal(false);
  settingsOpen  = signal(false);
  exitDialogOpen = signal(false);

  // ── Dummy hands ───────────────────────────────────────────────────────
  visibleHand: HandModel = {
    tiles: [
      { type: TileType.Number, suit: NumberSuit.Bamboo, faceValue: 3, id: 'bamboo-3-0', currentValue: 3 },
      { type: TileType.Number, suit: NumberSuit.Dots,   faceValue: 5, id: 'dots-5-0',   currentValue: 5 },
      { type: TileType.Wind,   suit: WindSuit.South,    faceValue: 0, id: 'wind-s-0',   currentValue: 5 },
    ],
    total: 13,
  };

  hiddenHand: HandModel = {
    tiles: [
      { type: TileType.Dragon, suit: DragonSuit.Red,    faceValue: 0, id: 'dragon-r-0', currentValue: 7 },
      { type: TileType.Number, suit: NumberSuit.Pinyin, faceValue: 6, id: 'pinyin-6-0', currentValue: 6 },
      { type: TileType.Number, suit: NumberSuit.Bamboo, faceValue: 2, id: 'bamboo-2-0', currentValue: 2 },
    ],
    total: 15,
  };

  // ── Dummy stats ───────────────────────────────────────────────────────
  score          = 1250;
  winStreak      = 3;
  drawCount      = 48;
  discardCount   = 22;
  reshuffleCount = 1;

  handHistory: HandHistoryItem[] = [
    { round: 1, bet: 'higher', result: 'win',  scoreChange:  26 },
    { round: 2, bet: 'lower',  result: 'win',  scoreChange:  18 },
    { round: 3, bet: 'higher', result: 'lose', scoreChange: -11 },
    { round: 4, bet: 'higher', result: 'win',  scoreChange:  14 },
    { round: 5, bet: 'lower',  result: 'win',  scoreChange:  32 },
  ];

  settings: PlayerSettingsModel = {
    handSize: 3,
    soundEnabled: true,
    musicEnabled: false,
    showTileValues: true,
    playerName: null,
    hasSeenTutorial: false,
  };

  // ── Handlers ─────────────────────────────────────────────────────────
  onBetPlaced(bet: 'higher' | 'lower') {
    console.log('Bet placed:', bet);
  }

  onSettingsChanged(partial: Partial<PlayerSettingsModel>) {
    this.settings = { ...this.settings, ...partial };
  }

  onExitGame() {
    this.exitDialogOpen.set(false);
    this.pauseOpen.set(false);
    this.router.navigate(['/']);
  }
}