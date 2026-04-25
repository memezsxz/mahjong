import { Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BetControls, DeckCounter, Hand, HandHistory, PauseMenu, ScoreDisplay, SettingsPanel } from '@hbg/game-ui';
import {
  Bet,
  GameOverReason,
  GamePhase,
  HandModel,
  PlayerSettingsModel,
} from '@hbg/shared-models';
import { GameStore, LeaderboardService, SettingsService } from '@hbg/game-data-access';
import {
  getBetControlsDelay,
  getHiddenHandBaseDelay,
  getNextRoundBetControlsDelay,
  getSingleHandDealDuration,
  NEXT_ROUND_INCOMING_HIDDEN_DELAY_MS,
  NEXT_ROUND_PROMOTE_DELAY_MS,
  NEXT_ROUND_TRANSITION_TOTAL_MS,
  NEXT_ROUND_VISIBLE_TOTAL_ENTER_DELAY_MS,
  WIN_BANNER_SHOW_MS,
  WIN_POST_VALUE_SETTLE_MS,
  WIN_VALUE_STEP_MS,
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
  styleUrls: [
    './game-page.layout.css',
    './game-page.deal.css',
    './game-page.round-transition.css',
  ],
})
export class GamePage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly store = inject(GameStore);
  readonly settingsService = inject(SettingsService);
  private readonly leaderboardService = inject(LeaderboardService);
  steadyHandsShouldDeal = signal(true);
  roundTransitionActive = signal(false);
  visibleHandExitActive = signal(false);

  // ── Expose enum to template ───────────────────────────────────────────
  readonly GamePhase = GamePhase;

  // ── UI-only overlay state ─────────────────────────────────────────────
  settingsOpen = signal(false);
  exitDialogOpen = signal(false);
  scoreSaved = signal(false);
  dealCount = signal(0);
  betControlsReady = signal(false);
  promotedHandMoveActive = signal(false);
  incomingHiddenEnterActive = signal(false);
  incomingVisibleTotalActive = signal(false);
  transitionOutgoingVisibleHand = signal(this.store.visibleHand());
  transitionPromotedVisibleHand = signal(this.store.hiddenHand());
  transitionIncomingHiddenHand = signal(this.store.hiddenHand());
  transitionOutgoingVisibleTotal = signal<number | null>(null);
  transitionIncomingVisibleTotal = signal<number | null>(null);
  revealWinBannerActive = signal(false);
  revealValueAnimationActive = signal(false);
  revealSequenceLocked = signal(false);
  revealTileValueOverrides = signal<Record<string, number> | null>(null);
  revealHiddenTotalOverride = signal<number | null>(null);
  revealPreWinHiddenHand = signal<HandModel | null>(null);
  revealPostWinHiddenHand = signal<HandModel | null>(null);
  winRevealOldTileValues = computed<Record<string, number> | null>(() => {
    const hand = this.revealPreWinHiddenHand();
    if (!hand) return null;
    return Object.fromEntries(hand.tiles.map((tile) => [tile.id, tile.currentValue]));
  });
  winRevealNewTileValues = computed<Record<string, number> | null>(() => {
    const hand = this.revealPostWinHiddenHand();
    if (!hand) return null;
    return Object.fromEntries(hand.tiles.map((tile) => [tile.id, tile.currentValue]));
  });
  winRevealOldTotal = computed<number | null>(() => this.revealPreWinHiddenHand()?.total ?? null);
  winRevealNewTotal = computed<number | null>(() => this.revealPostWinHiddenHand()?.total ?? null);
  winRevealAnimationRunning = computed<boolean>(() => this.revealSequenceLocked());
  revealResultBannerText = computed<'WIN' | 'LOSE' | null>(() => {
    if (this.roundTransitionActive() || this.store.gamePhase() !== GamePhase.Revealing) {
      return null;
    }
    if (this.store.lastResult() === 'win') {
      return 'WIN';
    }
    if (this.store.lastResult() === 'lose') {
      return 'LOSE';
    }
    return null;
  });
  transitionPromotedStartX = signal(0);
  transitionPromotedStartY = signal(0);
  transitionPromotedDeltaX = signal(0);
  transitionPromotedDeltaY = signal(0);
  private readonly mainStageRef =
    viewChild<ElementRef<HTMLElement>>('mainStage');
  private readonly centerStageRef =
    viewChild<ElementRef<HTMLElement>>('centerStage');
  private readonly bottomHandSlotRef =
    viewChild<ElementRef<HTMLElement>>('bottomHandSlot');
  private betControlsTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly animationTimers = new Set<ReturnType<typeof setTimeout>>();
  private readonly revealTimers = new Set<ReturnType<typeof setTimeout>>();
  private readonly betControlsDelayMs = signal(0);

  // ── Deal animation timing ─────────────────────────────────────────────
  readonly singleHandDealDuration = computed(() => {
    return getSingleHandDealDuration(this.settingsService.settings().handSize);
  });
  readonly hiddenHandBaseDelay = computed(() =>
    getHiddenHandBaseDelay(this.settingsService.settings().handSize),
  );
  readonly betControlsDelay = computed(
    () =>
      this.betControlsDelayMs() ||
      getBetControlsDelay(this.settingsService.settings().handSize),
  );

  // ── Derived deck counts ───────────────────────────────────────────────
  drawCount = computed(() => this.store.drawPile().length);
  discardCount = computed(() => this.store.discard().length);

  // ── Game over reason → human-readable copy ────────────────────────────
  gameOverMessage = computed(() => {
    const messages: Record<NonNullable<GameOverReason>, string> = {
      'tile-min': 'A tile hit zero — the hand collapsed.',
      'tile-max': 'A tile maxed out — the hand is too powerful.',
      reshuffle: 'The deck ran out of reshuffles.',
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
        this.leaderboardService
          .saveScore({
            playerName:
              this.settingsService.settings().playerName ?? 'Anonymous',
            totalScore: this.store.currentScore(),
            date: Date.now(),
          })
          .subscribe();
      }
    });

    effect(() => {
      const phase = this.store.gamePhase();
      const visibleHand = this.store.visibleHand();
      const hiddenHand = this.store.hiddenHand();
      const transitionActive = this.roundTransitionActive();
      this.dealCount();

      if (
        transitionActive ||
        phase !== GamePhase.Betting ||
        !visibleHand ||
        !hiddenHand
      ) {
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
    this.betControlsDelayMs.set(
      getBetControlsDelay(this.settingsService.settings().handSize),
    );
    this.steadyHandsShouldDeal.set(true);
    this.store.startGame();
  }

  ngOnDestroy() {
    this.clearBetControlsTimer();
    this.clearAnimationTimers();
    this.clearRevealTimers();
  }

  // ── Handlers ──────────────────────────────────────────────────────────
  onBetPlaced(bet: 'higher' | 'lower') {
    if (this.store.gamePhase() !== GamePhase.Betting) return;
    const hiddenHandBeforeBet = this.store.hiddenHand();
    if (!hiddenHandBeforeBet) return;

    this.clearRevealTimers();
    this.resetRevealAnimationState();

    const hiddenHandSnapshot: HandModel = {
      total: hiddenHandBeforeBet.total,
      tiles: hiddenHandBeforeBet.tiles.map((tile) => ({ ...tile })),
    };

    this.store.placeBet(bet === 'higher' ? Bet.High : Bet.Low);

    const result = this.store.lastResult();
    if (
      (result !== 'win' && result !== 'lose') ||
      this.store.gamePhase() !== GamePhase.Revealing
    ) {
      return;
    }

    const hiddenHandAfterBet = this.store.hiddenHand();
    if (!hiddenHandAfterBet) return;

    this.revealPreWinHiddenHand.set(hiddenHandSnapshot);
    this.revealPostWinHiddenHand.set(hiddenHandAfterBet);
    this.startWinRevealAnimation(hiddenHandSnapshot, hiddenHandAfterBet);
  }

  onNextHand() {
    if (this.roundTransitionActive() || this.revealSequenceLocked()) {
      return;
    }

    const outgoingVisibleHand = this.store.visibleHand();
    const promotedVisibleHand = this.store.hiddenHand();
    if (!outgoingVisibleHand || !promotedVisibleHand) {
      return;
    }

    this.clearAnimationTimers();
    this.clearRevealTimers();
    this.resetRevealAnimationState();
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
    this.clearRevealTimers();
    this.resetRevealAnimationState();
    this.clearBetControlsTimer();
    this.steadyHandsShouldDeal.set(true);
    this.betControlsDelayMs.set(
      getBetControlsDelay(this.settingsService.settings().handSize),
    );
    this.store.startGame();
    this.dealCount.update((n) => n + 1);
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
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
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
      }),
    );
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

  private queueRevealTimer(fn: () => void, delay: number): void {
    const timer = setTimeout(() => {
      this.revealTimers.delete(timer);
      fn();
    }, delay);
    this.revealTimers.add(timer);
  }

  private clearRevealTimers(): void {
    for (const timer of this.revealTimers) {
      clearTimeout(timer);
    }
    this.revealTimers.clear();
  }

  private resetRevealAnimationState(): void {
    this.revealWinBannerActive.set(false);
    this.revealValueAnimationActive.set(false);
    this.revealSequenceLocked.set(false);
    this.revealTileValueOverrides.set(null);
    this.revealHiddenTotalOverride.set(null);
    this.revealPreWinHiddenHand.set(null);
    this.revealPostWinHiddenHand.set(null);
  }

  private startWinRevealAnimation(
    preWinHand: HandModel,
    postWinHand: HandModel,
  ): void {
    const startValues = Object.fromEntries(
      preWinHand.tiles.map((tile) => [tile.id, tile.currentValue]),
    );
    const finalValues = Object.fromEntries(
      postWinHand.tiles.map((tile) => [tile.id, tile.currentValue]),
    );
    const valueSteps: Array<{ id: string; value: number; total: number }> = [];
    let runningTotal = preWinHand.total;

    for (const tile of postWinHand.tiles) {
      const oldValue = startValues[tile.id] ?? tile.currentValue;
      const delta = tile.currentValue - oldValue;
      if (delta === 0) continue;

      const direction = delta > 0 ? 1 : -1;
      let nextValue = oldValue;
      for (let i = 0; i < Math.abs(delta); i += 1) {
        nextValue += direction;
        runningTotal += direction;
        valueSteps.push({ id: tile.id, value: nextValue, total: runningTotal });
      }
    }

    this.revealSequenceLocked.set(true);
    this.revealWinBannerActive.set(true);
    this.revealTileValueOverrides.set(startValues);
    this.revealHiddenTotalOverride.set(preWinHand.total);

    this.queueRevealTimer(() => {
      this.revealValueAnimationActive.set(true);
    }, WIN_BANNER_SHOW_MS);

    valueSteps.forEach((step, index) => {
      this.queueRevealTimer(
        () => {
          const currentValues = this.revealTileValueOverrides() ?? {};
          this.revealTileValueOverrides.set({
            ...currentValues,
            [step.id]: step.value,
          });
          this.revealHiddenTotalOverride.set(step.total);
        },
        WIN_BANNER_SHOW_MS + (index + 1) * WIN_VALUE_STEP_MS,
      );
    });

    const finishDelay =
      WIN_BANNER_SHOW_MS + valueSteps.length * WIN_VALUE_STEP_MS + WIN_POST_VALUE_SETTLE_MS;
    this.queueRevealTimer(() => {
      this.revealTileValueOverrides.set(finalValues);
      this.revealHiddenTotalOverride.set(postWinHand.total);
      this.revealWinBannerActive.set(false);
      this.revealValueAnimationActive.set(false);
      this.revealSequenceLocked.set(false);
      this.revealPreWinHiddenHand.set(null);
      this.revealPostWinHiddenHand.set(null);
      this.queueRevealTimer(() => {
        this.revealTileValueOverrides.set(null);
        this.revealHiddenTotalOverride.set(null);
      }, 40);
    }, finishDelay);
  }
}
