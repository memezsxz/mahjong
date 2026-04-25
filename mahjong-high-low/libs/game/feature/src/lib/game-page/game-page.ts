import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
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
} from '@hbg/game-ui';
import { Bet, GameOverReason, GamePhase, PlayerSettingsModel } from '@hbg/shared-models';
import { GameStore, LeaderboardService, SettingsService } from '@hbg/game-data-access';

@Component({
  selector: 'lib-game-page',
  imports: [
    DecimalPipe,
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
export class GamePage implements OnInit {
  private readonly router             = inject(Router);
  readonly store                      = inject(GameStore);
  readonly settingsService            = inject(SettingsService);
  private readonly leaderboardService = inject(LeaderboardService);

  // ── Expose enum to template ───────────────────────────────────────────
  readonly GamePhase = GamePhase;

  // ── UI-only overlay state ─────────────────────────────────────────────
  settingsOpen   = signal(false);
  exitDialogOpen = signal(false);
  scoreSaved     = signal(false);

  // ── Derived deck counts ───────────────────────────────────────────────
  drawCount    = computed(() => this.store.drawPile().length);
  discardCount = computed(() => this.store.discard().length);

  // ── Game over reason → human-readable copy ────────────────────────────
  gameOverMessage = computed(() => {
    const messages: Record<NonNullable<GameOverReason>, string> = {
      'tile-min':  'A tile hit zero — the hand collapsed.',
      'tile-max':  'A tile maxed out — the hand is too powerful.',
      'reshuffle': 'The deck ran out of reshuffles.',
    };
    const reason = this.store.gameOverReason();
    return reason ? messages[reason] : '';
  });

  // ── Last 5 rounds for the sidebar history ────────────────────────────
  handHistory = computed(() => [...this.store.handHistory()].reverse());

  constructor() {
    effect(() => {
      if (this.store.gamePhase() === GamePhase.GameOver && !this.scoreSaved()) {
        this.scoreSaved.set(true);
        this.leaderboardService.saveScore({
          playerName: this.settingsService.settings().playerName ?? 'Anonymous',
          totalScore: this.store.currentScore(),
          date:       Date.now(),
        }).subscribe();
      }
    });
  }

  ngOnInit() {
    this.store.startGame();
  }

  // ── Handlers ──────────────────────────────────────────────────────────
  onBetPlaced(bet: 'higher' | 'lower') {
    if (this.store.gamePhase() !== GamePhase.Betting) return;
    this.store.placeBet(bet === 'higher' ? Bet.High : Bet.Low);
  }

  onNextHand() {
    this.store.nextHand();
  }

  onSettingsChanged(partial: Partial<PlayerSettingsModel>) {
    this.settingsService.update(partial);
  }

  onPlayAgain() {
    this.scoreSaved.set(false);
    this.store.startGame();
  }

  onExitGame() {
    this.scoreSaved.set(false);
    this.store.exitGame();
    this.exitDialogOpen.set(false);
    this.router.navigate(['/']);
  }
}