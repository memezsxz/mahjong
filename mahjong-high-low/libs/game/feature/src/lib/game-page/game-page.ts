import { Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BetControls, DeckCounter, Hand, HandHistory, PauseMenu, ScoreDisplay, SettingsPanel } from '@hbg/game-ui';
import { Bet, GameOverReason, GamePhase, PlayerSettingsModel } from '@hbg/shared-models';
import { GameStore, LeaderboardService, SettingsService } from '@hbg/game-data-access';
import {
  getBetControlsDelay,
  getHiddenHandBaseDelay,
  getNextRoundBetControlsDelay,
  NEXT_ROUND_INCOMING_HIDDEN_DELAY_MS,
  getSingleHandDealDuration,
  NEXT_ROUND_PROMOTE_DELAY_MS,
  NEXT_ROUND_TRANSITION_TOTAL_MS,
  NEXT_ROUND_VISIBLE_TOTAL_ENTER_DELAY_MS
} from './game-page.animations';

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
  styleUrls: ['./game-page.layout.css', './game-page.deal.css', './game-page.round-transition.css'],
})
export class GamePage implements OnInit, OnDestroy {
  private readonly router             = inject(Router);
  readonly store                      = inject(GameStore);
  readonly settingsService            = inject(SettingsService);
  private readonly leaderboardService = inject(LeaderboardService);
  steadyHandsShouldDeal = signal(true);
  roundTransitionActive = signal(false);
  visibleHandExitActive = signal(false);

  // ── Expose enum to template ───────────────────────────────────────────
  readonly GamePhase = GamePhase;

  // ── UI-only overlay state ─────────────────────────────────────────────
  settingsOpen   = signal(false);
  exitDialogOpen = signal(false);
  scoreSaved     = signal(false);
  dealCount      = signal(0);
  betControlsReady = signal(false);
  promotedHandMoveActive = signal(false);
  incomingHiddenEnterActive = signal(false);
  incomingVisibleTotalActive = signal(false);
  transitionOutgoingVisibleHand = signal(this.store.visibleHand());
  transitionPromotedVisibleHand = signal(this.store.hiddenHand());
  transitionIncomingHiddenHand = signal(this.store.hiddenHand());
  transitionOutgoingVisibleTotal = signal<number | null>(null);
  transitionIncomingVisibleTotal = signal<number | null>(null);
  transitionPromotedStartX = signal(0);
  transitionPromotedStartY = signal(0);
  transitionPromotedDeltaX = signal(0);
  transitionPromotedDeltaY = signal(0);
  private readonly mainStageRef       = viewChild<ElementRef<HTMLElement>>('mainStage');
  private readonly centerStageRef     = viewChild<ElementRef<HTMLElement>>('centerStage');
  private readonly bottomHandSlotRef  = viewChild<ElementRef<HTMLElement>>('bottomHandSlot');
  private betControlsTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly animationTimers = new Set<ReturnType<typeof setTimeout>>();
  private readonly betControlsDelayMs = signal(0);

  // ── Deal animation timing ─────────────────────────────────────────────
  readonly singleHandDealDuration = computed(() => {
    return getSingleHandDealDuration(this.settingsService.settings().handSize);
  });
  readonly hiddenHandBaseDelay = computed(() => getHiddenHandBaseDelay(this.settingsService.settings().handSize));
  readonly betControlsDelay = computed(() => this.betControlsDelayMs() || getBetControlsDelay(this.settingsService.settings().handSize));

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

    effect(() => {
      const phase = this.store.gamePhase();
      const visibleHand = this.store.visibleHand();
      const hiddenHand = this.store.hiddenHand();
      const transitionActive = this.roundTransitionActive();
      this.dealCount();

      if (transitionActive || phase !== GamePhase.Betting || !visibleHand || !hiddenHand) {
        this.clearBetControlsTimer();
        this.betControlsReady.set(false);
        return;
      }

      this.clearBetControlsTimer();
      this.betControlsReady.set(false);
      this.betControlsTimer = setTimeout(() => {
        this.betControlsReady.set(true);
      }, this.betControlsDelay());
    });
  }

  ngOnInit() {
    this.betControlsDelayMs.set(getBetControlsDelay(this.settingsService.settings().handSize));
    this.steadyHandsShouldDeal.set(true);
    this.store.startGame();
  }

  ngOnDestroy() {
    this.clearBetControlsTimer();
    this.clearAnimationTimers();
  }

  // ── Handlers ──────────────────────────────────────────────────────────
  onBetPlaced(bet: 'higher' | 'lower') {
    if (this.store.gamePhase() !== GamePhase.Betting) return;
    this.store.placeBet(bet === 'higher' ? Bet.High : Bet.Low);
  }

  onNextHand() {
    if (this.roundTransitionActive()) {
      return;
    }

    const outgoingVisibleHand = this.store.visibleHand();
    const promotedVisibleHand = this.store.hiddenHand();
    if (!outgoingVisibleHand || !promotedVisibleHand) {
      return;
    }

    this.clearAnimationTimers();
    this.clearBetControlsTimer();
    this.measureRoundTransition();
    this.transitionOutgoingVisibleHand.set(outgoingVisibleHand);
    this.transitionPromotedVisibleHand.set(promotedVisibleHand);
    this.transitionOutgoingVisibleTotal.set(outgoingVisibleHand.total);
    this.transitionIncomingVisibleTotal.set(promotedVisibleHand.total);
    this.transitionIncomingHiddenHand.set(null);
    this.roundTransitionActive.set(true);
    this.visibleHandExitActive.set(false);
    this.promotedHandMoveActive.set(false);
    this.incomingHiddenEnterActive.set(false);
    this.incomingVisibleTotalActive.set(false);
    this.steadyHandsShouldDeal.set(false);
    this.betControlsDelayMs.set(getNextRoundBetControlsDelay());

    this.store.nextHand();
    this.transitionIncomingHiddenHand.set(this.store.hiddenHand());
    this.startRoundTransition();
  }

  onSettingsChanged(partial: Partial<PlayerSettingsModel>) {
    this.settingsService.update(partial);
  }

  onPlayAgain() {
    this.scoreSaved.set(false);
    this.finishRoundTransition();
    this.clearAnimationTimers();
    this.clearBetControlsTimer();
    this.steadyHandsShouldDeal.set(true);
    this.betControlsDelayMs.set(getBetControlsDelay(this.settingsService.settings().handSize));
    this.store.startGame();
    this.dealCount.update(n => n + 1);
  }

  onExitGame() {
    this.scoreSaved.set(false);
    this.store.exitGame();
    this.exitDialogOpen.set(false);
    this.router.navigate(['/']);
  }

  private clearBetControlsTimer(): void {
    if (this.betControlsTimer !== null) {
      clearTimeout(this.betControlsTimer);
      this.betControlsTimer = null;
    }
  }

  private startRoundTransition(): void {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.visibleHandExitActive.set(true);

      this.queueAnimationTimer(() => {
        this.promotedHandMoveActive.set(true);
      }, NEXT_ROUND_PROMOTE_DELAY_MS);

      this.queueAnimationTimer(() => {
        this.incomingHiddenEnterActive.set(true);
      }, NEXT_ROUND_INCOMING_HIDDEN_DELAY_MS);

      this.queueAnimationTimer(() => {
        this.incomingVisibleTotalActive.set(true);
      }, NEXT_ROUND_VISIBLE_TOTAL_ENTER_DELAY_MS);

      this.queueAnimationTimer(() => {
        this.finishRoundTransition();
      }, NEXT_ROUND_TRANSITION_TOTAL_MS);
    }));
  }

  private finishRoundTransition(): void {
    this.clearAnimationTimers();
    this.roundTransitionActive.set(false);
    this.visibleHandExitActive.set(false);
    this.promotedHandMoveActive.set(false);
    this.incomingHiddenEnterActive.set(false);
    this.incomingVisibleTotalActive.set(false);
    this.transitionOutgoingVisibleHand.set(null);
    this.transitionPromotedVisibleHand.set(null);
    this.transitionIncomingHiddenHand.set(null);
    this.transitionOutgoingVisibleTotal.set(null);
    this.transitionIncomingVisibleTotal.set(null);
    this.steadyHandsShouldDeal.set(false);
  }

  private measureRoundTransition(): void {
    const main = this.mainStageRef()?.nativeElement;
    const center = this.centerStageRef()?.nativeElement;
    const bottom = this.bottomHandSlotRef()?.nativeElement;
    if (!main || !center || !bottom) return;

    const mainRect = main.getBoundingClientRect();
    const centerRect = center.getBoundingClientRect();
    const bottomRect = bottom.getBoundingClientRect();
    const centerX = centerRect.left + centerRect.width / 2 - mainRect.left;
    const centerY = centerRect.top + centerRect.height / 2 - mainRect.top;
    const bottomX = bottomRect.left + bottomRect.width / 2 - mainRect.left;
    const bottomY = bottomRect.top + bottomRect.height / 2 - mainRect.top;

    this.transitionPromotedStartX.set(centerX);
    this.transitionPromotedStartY.set(centerY);
    this.transitionPromotedDeltaX.set(bottomX - centerX);
    this.transitionPromotedDeltaY.set(bottomY - centerY);
  }

  private queueAnimationTimer(fn: () => void, delay: number): void {
    const timer = setTimeout(() => {
      this.animationTimers.delete(timer);
      fn();
    }, delay);
    this.animationTimers.add(timer);
  }

  private clearAnimationTimers(): void {
    for (const timer of this.animationTimers) {
      clearTimeout(timer);
    }
    this.animationTimers.clear();
  }
}
