import { Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BetControls, DeckCounter, Hand, HandHistory, PauseMenu, ScoreDisplay, SettingsPanel } from '@hbg/game-ui';
import { Bet, GameOverReason, GamePhase, HandModel, PlayerSettingsModel } from '@hbg/shared-models';
import { GameAudioManager, GameStore, LeaderboardService, SettingsService } from '@hbg/game-data-access';
import { buildDeck } from '@hbg/shared-util-game';
import {
  getBetControlsDelay,
  getHiddenHandBaseDelay,
  getNextRoundBetControlsDelay,
  getSingleHandDealDuration,
  HIDDEN_REVEAL_POST_TILE_MS,
  HIDDEN_REVEAL_SETTLE_MS,
  HIDDEN_REVEAL_TOTAL_STEP_MS,
  HIDDEN_REVEAL_VALUE_DELAY_MS,
  NEXT_ROUND_INCOMING_HIDDEN_DELAY_MS,
  NEXT_ROUND_INCOMING_HIDDEN_MS,
  NEXT_ROUND_PROMOTE_DELAY_MS,
  NEXT_ROUND_TRANSITION_TOTAL_MS,
  NEXT_ROUND_VISIBLE_TOTAL_ENTER_DELAY_MS,
  SCORE_GAIN_FLY_MS,
  SCORE_GAIN_SETTLE_MS,
  WIN_BANNER_SHOW_MS,
  WIN_POST_VALUE_SETTLE_MS,
  WIN_VALUE_STEP_MS
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
  reshuffleSequenceActive = signal(false);
  private previousScoreDisplayValue: number | null = null;
  private previousReshuffleDrawValue: number | null = null;
  private previousReshuffleDiscardValue: number | null = null;
  private lastInitialDealSoundCount = -1;

  private readonly router = inject(Router);
  readonly store = inject(GameStore);
  readonly settingsService = inject(SettingsService);
  readonly audioManager = inject(GameAudioManager);
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
  gameOverNameDraft = signal('');
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
  reshuffleSequenceExitActive = signal(false);
  reshuffleDisplayDrawCount = signal<number | null>(null);
  reshuffleDisplayDiscardCount = signal<number | null>(null);
  reshuffleTransitionPendingIncoming = signal(false);
  reshufflePattern = signal(0);
  revealTileFaceUpIds = signal<string[] | null>(null);
  revealTileValueVisibleIds = signal<string[] | null>(null);
  revealWinBannerActive = signal(false);
  revealHistoryReady = signal(false);
  revealValueAnimationActive = signal(false);
  revealSequenceLocked = signal(false);
  scoreDisplayOverride = signal<number | null>(null);
  scoreGainAnimationActive = signal(false);
  revealTileValueOverrides = signal<Record<string, number> | null>(null);
  revealHiddenTotalOverride = signal<number | null>(null);
  scoreGainTravelActive = signal(false);
  scoreGainAmount = signal(0);
  scoreGainDirection = signal<'up' | 'down'>('down');
  scoreGainStartX = signal(0);
  scoreGainStartY = signal(0);
  scoreGainDeltaX = signal(0);
  scoreGainDeltaY = signal(0);
  revealAllTilesRevealed = computed<boolean>(() => {
    const hand = this.store.hiddenHand();
    const valueVisibleIds = this.revealTileValueVisibleIds();
    if (!hand || valueVisibleIds === null) return true;
    return valueVisibleIds.length >= hand.tiles.length;
  });
  revealResultBannerText = computed<'WIN' | 'LOSE' | null>(() => {
    if (
      this.roundTransitionActive() ||
      this.store.gamePhase() !== GamePhase.Revealing ||
      !this.revealAllTilesRevealed() ||
      !this.revealWinBannerActive()
    ) {
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
  visibleWinStreak = computed<number>(() => {
    if (
      this.store.gamePhase() === GamePhase.Revealing &&
      !this.revealHistoryReady()
    ) {
      return Math.max(0, this.store.winStreak() - 1);
    }

    return this.store.winStreak();
  });
  debugForceReshuffleNextHand = signal(false);
  // DEV toggle: set true to show debug controls for forcing reshuffle flow.
  private readonly DEBUG_MODE = true;
  transitionPromotedStartX = signal(0);
  transitionPromotedStartY = signal(0);
  transitionPromotedDeltaX = signal(0);
  transitionPromotedDeltaY = signal(0);
  debugMode = signal(this.DEBUG_MODE);
  private readonly freshDeckSize = buildDeck().length;
  private readonly mainStageRef =
    viewChild<ElementRef<HTMLElement>>('mainStage');
  private readonly centerStageRef =
    viewChild<ElementRef<HTMLElement>>('centerStage');
  private readonly pageFrameRef =
    viewChild<ElementRef<HTMLElement>>('pageFrame');
  private readonly bottomHandSlotRef =
    viewChild<ElementRef<HTMLElement>>('bottomHandSlot');
  private readonly scoreDisplaySlotRef =
    viewChild<ElementRef<HTMLElement>>('scoreDisplaySlot');
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
  needsGameOverName = computed(() => !this.getTrimmedPlayerName());

  // ── Last 5 rounds for the sidebar history ────────────────────────────
  handHistory = computed(() => {
    const history = [...this.store.handHistory()];
    const shouldHoldLatestEntry =
      this.store.gamePhase() === GamePhase.Revealing &&
      !this.revealHistoryReady() &&
      history.length > 0;

    if (shouldHoldLatestEntry) {
      history.pop();
    }

    return history.reverse();
  });

  constructor() {
    effect(() => {
      if (this.store.gamePhase() !== GamePhase.GameOver) {
        return;
      }

      this.gameOverNameDraft.set(this.settingsService.settings().playerName ?? '');

      if (!this.scoreSaved() && !this.needsGameOverName()) {
        this.saveScore();
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

    effect(() => {
      const phase = this.store.gamePhase();
      const visibleHand = this.store.visibleHand();
      const hiddenHand = this.store.hiddenHand();
      const shouldDeal = this.steadyHandsShouldDeal();
      const dealCount = this.dealCount();

      if (
        phase !== GamePhase.Betting ||
        !shouldDeal ||
        !visibleHand ||
        !hiddenHand ||
        this.lastInitialDealSoundCount === dealCount
      ) {
        return;
      }

      this.lastInitialDealSoundCount = dealCount;
      this.queueAnimationTimer(() => {
        this.audioManager.playTileIn(this.store.handSize());
      }, 0);
      this.queueAnimationTimer(() => {
        this.audioManager.playTileIn(this.store.handSize());
      }, this.hiddenHandBaseDelay());
    });

    effect(() => {
      const scoreValue = this.scoreDisplayOverride();
      this.playStepSoundForValueChange(
        scoreValue,
        'previousScoreDisplayValue',
      );
    });

    effect(() => {
      const drawValue = this.reshuffleDisplayDrawCount();
      this.playStepSoundForValueChange(
        drawValue,
        'previousReshuffleDrawValue',
      );
    });

    effect(() => {
      const discardValue = this.reshuffleDisplayDiscardCount();
      this.playStepSoundForValueChange(
        discardValue,
        'previousReshuffleDiscardValue',
      );
    });

    effect(() => {
      const phase = this.store.gamePhase();
      const paused = this.store.isPaused();
      const musicEnabled = this.settingsService.settings().musicEnabled;

      if (!musicEnabled || phase === GamePhase.Idle || phase === GamePhase.GameOver) {
        this.audioManager.syncMusic('none');
        return;
      }

      this.audioManager.syncMusic(paused ? 'pause' : 'gameplay');
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
    this.resetReshuffleSequenceState();
    this.audioManager.syncMusic('none');
  }

  // ── Handlers ──────────────────────────────────────────────────────────
  onBetPlaced(bet: 'higher' | 'lower') {
    if (this.store.gamePhase() !== GamePhase.Betting) return;
    this.handleButtonInteraction();
    const hiddenHandBeforeBet = this.store.hiddenHand();
    if (!hiddenHandBeforeBet) return;
    const scoreBeforeBet = this.store.currentScore();

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
    const scoreAfterBet = this.store.currentScore();

    this.revealPreWinHiddenHand.set(hiddenHandSnapshot);
    this.revealPostWinHiddenHand.set(hiddenHandAfterBet);
    this.startHiddenHandRevealSequence(
      hiddenHandSnapshot,
      hiddenHandAfterBet,
      scoreBeforeBet,
      scoreAfterBet,
    );
  }

  onNextHand() {
    if (this.roundTransitionActive() || this.revealSequenceLocked() || this.reshuffleSequenceActive()) {
      return;
    }
    this.handleButtonInteraction();

    const outgoingVisibleHand = this.store.visibleHand();
    const promotedVisibleHand = this.store.hiddenHand();
    if (!outgoingVisibleHand || !promotedVisibleHand) {
      return;
    }

    this.clearAnimationTimers();
    this.clearRevealTimers();
    this.reshuffleTransitionPendingIncoming.set(false);
    this.resetRevealAnimationState();
    this.resetReshuffleSequenceState();
    this.clearReshuffleDisplayCounts();
    this.clearBetControlsTimer();

    const drawBefore = this.store.drawPile().length;
    const discardBefore = this.store.discard().length;
    const handSize = this.store.handSize();
    const forceReshuffle = this.debugForceReshuffleNextHand();
    const actualReshuffle = drawBefore < handSize;
    const reshuffleNeeded = actualReshuffle || forceReshuffle;

    if (reshuffleNeeded) {
      // Only animate counter changes that the store will actually commit.
      // A debug-forced reshuffle may still show the reshuffle presentation, but
      // it must not fake final counter values that won't exist in store state.
      const drawAfterReshuffle = actualReshuffle
        ? Math.max(0, this.freshDeckSize + drawBefore + discardBefore)
        : drawBefore;
      const discardAfterReshuffle = actualReshuffle ? 0 : discardBefore;
      this.startReshuffleSequence(drawBefore, discardBefore, drawAfterReshuffle, discardAfterReshuffle, () => {
        this.completeDeferredIncomingAfterReshuffle();
      });
      this.debugForceReshuffleNextHand.set(false);
      this.executeNextHandTransition(outgoingVisibleHand, promotedVisibleHand, true);
      return;
    }

    this.debugForceReshuffleNextHand.set(false);
    this.executeNextHandTransition(outgoingVisibleHand, promotedVisibleHand);
  }

  onDebugForceReshuffle() {
    if (!this.debugMode()) return;
    this.handleButtonInteraction();
    this.debugForceReshuffleNextHand.set(true);
    if (this.store.gamePhase() === GamePhase.Revealing) {
      this.onNextHand();
    }
  }

  onSettingsChanged(partial: Partial<PlayerSettingsModel>) {
    if (!('playerName' in partial)) {
      this.handleButtonInteraction();
    }
    this.settingsService.update(partial);
  }

  onPlayAgain() {
    this.handleButtonInteraction();
    this.scoreSaved.set(false);
    this.finishRoundTransition();
    this.clearAnimationTimers();
    this.clearRevealTimers();
    this.reshuffleTransitionPendingIncoming.set(false);
    this.resetRevealAnimationState();
    this.resetReshuffleSequenceState();
    this.clearReshuffleDisplayCounts();
    this.clearBetControlsTimer();
    this.steadyHandsShouldDeal.set(true);
    this.betControlsDelayMs.set(
      getBetControlsDelay(this.settingsService.settings().handSize),
    );
    this.store.startGame();
    this.dealCount.update((n) => n + 1);
  }

  onExitGame() {
    this.handleButtonInteraction();
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

  private startRoundTransition(deferIncomingHidden: boolean = false): void {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.visibleHandExitActive.set(true);
        this.audioManager.playTileOut();

        this.queueAnimationTimer(() => {
          this.promotedHandMoveActive.set(true);
          this.audioManager.playTileIn(this.store.handSize());
        }, NEXT_ROUND_PROMOTE_DELAY_MS);

        if (!deferIncomingHidden) {
          this.queueAnimationTimer(() => {
            this.incomingHiddenEnterActive.set(true);
            this.audioManager.playTileIn(this.store.handSize());
          }, NEXT_ROUND_INCOMING_HIDDEN_DELAY_MS);

          this.queueAnimationTimer(() => {
            this.incomingVisibleTotalActive.set(true);
          }, NEXT_ROUND_VISIBLE_TOTAL_ENTER_DELAY_MS);

          this.queueAnimationTimer(() => {
            this.finishRoundTransition();
          }, NEXT_ROUND_TRANSITION_TOTAL_MS);
        }
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

  private executeNextHandTransition(
    outgoingVisibleHand: HandModel,
    promotedVisibleHand: HandModel,
    deferIncomingHidden: boolean = false,
  ): void {
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

    if (deferIncomingHidden) {
      this.reshuffleTransitionPendingIncoming.set(true);
      this.startRoundTransition(true);
      return;
    }

    this.store.nextHand();
    this.transitionIncomingHiddenHand.set(this.store.hiddenHand());
    this.startRoundTransition(false);
  }

  private startReshuffleSequence(
    drawFrom: number,
    discardFrom: number,
    drawTo: number,
    discardTo: number,
    onDone: () => void,
  ): void {
    this.reshufflePattern.update(v => (v + 1) % 3);
    this.reshuffleSequenceActive.set(true);
    this.reshuffleSequenceExitActive.set(false);
    this.reshuffleDisplayDrawCount.set(drawFrom);
    this.reshuffleDisplayDiscardCount.set(discardFrom);

    const stepMs = 220;
    let cursorMs = 0;

    const scheduleSeries = (
      from: number,
      to: number,
      setValue: (v: number) => void,
      maxSteps: number,
    ): void => {
      const delta = to - from;
      if (delta === 0) return;
      const steps = Math.min(Math.abs(delta), maxSteps);
      const unit = Math.sign(delta);
      const baseJump = Math.floor(Math.abs(delta) / steps);
      let remainder = Math.abs(delta) % steps;
      let value = from;

      for (let i = 0; i < steps; i += 1) {
        const jump = baseJump + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        value += unit * jump;
        cursorMs += stepMs;
        const next = value;
        this.queueAnimationTimer(() => setValue(next), cursorMs);
      }
    };

    // 1) Discard first: animate down to 0 (slot up motion).
    scheduleSeries(discardFrom, discardTo, v => this.reshuffleDisplayDiscardCount.set(v), 14);
    // small pause between phases
    cursorMs += 240;
    // 2) Then draw: animate up to freshDeck+discard-handSize (slot down motion).
    scheduleSeries(drawFrom, drawTo, v => this.reshuffleDisplayDrawCount.set(v), 18);

    const settleDelay = cursorMs + 420;
    this.queueAnimationTimer(() => {
      this.reshuffleSequenceExitActive.set(true);
    }, settleDelay);

    this.queueAnimationTimer(() => {
      onDone();
      this.resetReshuffleSequenceState();
    }, settleDelay + 320);
  }

  private resetReshuffleSequenceState(): void {
    this.reshuffleSequenceActive.set(false);
    this.reshuffleSequenceExitActive.set(false);
  }

  private completeDeferredIncomingAfterReshuffle(): void {
    if (!this.reshuffleTransitionPendingIncoming()) {
      return;
    }

    this.reshuffleTransitionPendingIncoming.set(false);
    this.store.nextHand();
    this.reshuffleDisplayDrawCount.set(this.store.drawPile().length);
    this.reshuffleDisplayDiscardCount.set(this.store.discard().length);
    this.transitionIncomingHiddenHand.set(this.store.hiddenHand());
    this.incomingHiddenEnterActive.set(false);
    this.incomingVisibleTotalActive.set(false);

    if (!this.roundTransitionActive()) {
      return;
    }

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.incomingHiddenEnterActive.set(true);
        this.audioManager.playTileIn(this.store.handSize());
        this.queueAnimationTimer(() => {
          this.incomingVisibleTotalActive.set(true);
        }, 0);
        this.queueAnimationTimer(() => {
          this.finishRoundTransition();
          this.clearReshuffleDisplayCounts();
        }, NEXT_ROUND_INCOMING_HIDDEN_MS + 30);
      }),
    );
  }

  private clearReshuffleDisplayCounts(): void {
    const displayDraw = this.reshuffleDisplayDrawCount();
    const displayDiscard = this.reshuffleDisplayDiscardCount();

    if (displayDraw !== null && displayDraw !== this.store.drawPile().length) {
      return;
    }

    if (displayDiscard !== null && displayDiscard !== this.store.discard().length) {
      return;
    }

    this.reshuffleDisplayDrawCount.set(null);
    this.reshuffleDisplayDiscardCount.set(null);
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
    this.revealHistoryReady.set(false);
    this.revealValueAnimationActive.set(false);
    this.revealSequenceLocked.set(false);
    this.revealTileFaceUpIds.set(null);
    this.revealTileValueVisibleIds.set(null);
    this.revealTileValueOverrides.set(null);
    this.revealHiddenTotalOverride.set(null);
    this.scoreDisplayOverride.set(null);
    this.scoreGainAnimationActive.set(false);
    this.scoreGainTravelActive.set(false);
    this.scoreGainAmount.set(0);
    this.revealPreWinHiddenHand.set(null);
    this.revealPostWinHiddenHand.set(null);
  }

  private startHiddenHandRevealSequence(
    preWinHand: HandModel,
    postWinHand: HandModel,
    scoreBefore: number,
    scoreAfter: number,
  ): void {
    const revealValues = Object.fromEntries(
      preWinHand.tiles.map((tile) => [tile.id, tile.currentValue]),
    );

    this.revealSequenceLocked.set(true);
    this.revealTileFaceUpIds.set([]);
    this.revealTileValueVisibleIds.set([]);
    this.revealTileValueOverrides.set(revealValues);
    this.revealHiddenTotalOverride.set(0);
    if (scoreBefore !== scoreAfter) {
      this.scoreDisplayOverride.set(scoreBefore);
    }

    let runningTotal = 0;
    let cursorMs = 0;

    preWinHand.tiles.forEach((tile) => {
      const revealDelay = cursorMs;
      this.queueRevealTimer(() => {
        const currentFaceUp = this.revealTileFaceUpIds() ?? [];
        this.revealTileFaceUpIds.set([...currentFaceUp, tile.id]);
        this.audioManager.playTileFlip();
      }, revealDelay);

      const showValueDelay = revealDelay + HIDDEN_REVEAL_VALUE_DELAY_MS;
      this.queueRevealTimer(() => {
        const currentVisible = this.revealTileValueVisibleIds() ?? [];
        this.revealTileValueVisibleIds.set([...currentVisible, tile.id]);
      }, showValueDelay);

      const nextTotal = runningTotal + tile.currentValue;
      this.queueRevealTimer(() => {
        this.revealHiddenTotalOverride.set(nextTotal);
      }, showValueDelay + HIDDEN_REVEAL_TOTAL_STEP_MS);

      runningTotal = nextTotal;
      cursorMs =
        showValueDelay +
        HIDDEN_REVEAL_TOTAL_STEP_MS +
        HIDDEN_REVEAL_POST_TILE_MS;
    });

    const handRevealDoneMs = cursorMs + HIDDEN_REVEAL_SETTLE_MS;

    this.queueRevealTimer(() => {
      this.startScoreGainAnimation(scoreBefore, scoreAfter, () => {
        this.startWinRevealAnimation(preWinHand, postWinHand);
      });
    }, handRevealDoneMs);
  }

  private startScoreGainAnimation(
    scoreBefore: number,
    scoreAfter: number,
    onDone: () => void,
  ): void {
    const delta = scoreAfter - scoreBefore;
    if (delta === 0) {
      this.scoreDisplayOverride.set(null);
      onDone();
      return;
    }

    this.measureScoreGainTransition();
    this.scoreGainAmount.set(Math.abs(delta));
    this.scoreGainDirection.set(delta > 0 ? 'down' : 'up');
    this.scoreGainAnimationActive.set(true);
    this.scoreGainTravelActive.set(false);
    if (delta > 0) {
      this.audioManager.playScoreIncrease();
    } else {
      this.audioManager.playScoreDecrease();
    }

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        this.scoreGainTravelActive.set(true);
      }),
    );

    this.queueRevealTimer(() => {
      this.scoreDisplayOverride.set(scoreAfter);
    }, SCORE_GAIN_FLY_MS);

    this.queueRevealTimer(() => {
      this.scoreGainAnimationActive.set(false);
      this.scoreGainTravelActive.set(false);
      this.scoreDisplayOverride.set(null);
      onDone();
    }, SCORE_GAIN_FLY_MS + SCORE_GAIN_SETTLE_MS);
  }

  private measureScoreGainTransition(): void {
    const page = this.pageFrameRef()?.nativeElement;
    const center = this.centerStageRef()?.nativeElement;
    const scoreSlot = this.scoreDisplaySlotRef()?.nativeElement;
    if (!page || !center || !scoreSlot) return;

    const pageRect = page.getBoundingClientRect();
    const centerRect = center.getBoundingClientRect();
    const scoreRect = scoreSlot.getBoundingClientRect();
    const startX = centerRect.left + centerRect.width / 2 - pageRect.left;
    const startY = centerRect.top + centerRect.height / 2 + 54 - pageRect.top;
    const endX = scoreRect.left + scoreRect.width / 2 - pageRect.left;
    const endY = scoreRect.top + scoreRect.height / 2 - pageRect.top;

    this.scoreGainStartX.set(startX);
    this.scoreGainStartY.set(startY);
    this.scoreGainDeltaX.set(endX - startX);
    this.scoreGainDeltaY.set(endY - startY);
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
    this.revealHistoryReady.set(true);
    this.revealTileValueOverrides.set(startValues);
    this.revealHiddenTotalOverride.set(preWinHand.total);

    this.queueRevealTimer(() => {
      this.revealValueAnimationActive.set(true);
      if (this.store.lastResult() === 'win') {
        this.audioManager.playWin();
      } else if (this.store.lastResult() === 'lose') {
        this.audioManager.playLose();
      }
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

  openExitDialog(): void {
    this.handleButtonInteraction();
    this.exitDialogOpen.set(true);
  }

  closeExitDialog(): void {
    this.handleButtonInteraction();
    this.exitDialogOpen.set(false);
  }

  onPauseToggle(): void {
    this.handleButtonInteraction();
    this.store.togglePause();
  }

  onPauseResumed(): void {
    this.handleButtonInteraction();
    this.store.togglePause();
  }

  onPauseSettingsOpened(): void {
    this.handleButtonInteraction();
    this.settingsOpen.set(true);
  }

  onPauseExited(): void {
    this.handleButtonInteraction();
    this.exitDialogOpen.set(true);
    this.store.togglePause();
  }

  onSettingsPanelClosed(): void {
    this.handleButtonInteraction();
    this.settingsOpen.set(false);
  }

  onGameOverNameInput(value: string): void {
    this.gameOverNameDraft.set(value);
  }

  onSaveScoreWithName(): void {
    this.handleButtonInteraction();
    const playerName = this.gameOverNameDraft().trim();
    if (!playerName || this.scoreSaved()) {
      return;
    }

    this.settingsService.update({ playerName });
    this.saveScore(playerName);
  }

  private handleButtonInteraction(): void {
    this.audioManager.registerInteraction();
    this.audioManager.playButtonClick();
  }

  private getTrimmedPlayerName(): string | null {
    const playerName = this.settingsService.settings().playerName?.trim();
    return playerName ? playerName : null;
  }

  private saveScore(playerName: string | null = this.getTrimmedPlayerName()): void {
    if (!playerName || this.scoreSaved()) {
      return;
    }

    this.scoreSaved.set(true);
    this.leaderboardService
      .saveScore({
        playerName,
        totalScore: this.store.currentScore(),
        date: Date.now(),
      })
      .subscribe();
  }

  private playStepSoundForValueChange(
    nextValue: number | null,
    previousKey:
      | 'previousScoreDisplayValue'
      | 'previousReshuffleDrawValue'
      | 'previousReshuffleDiscardValue',
  ): void {
    const previousValue = this[previousKey];

    if (nextValue === null) {
      this[previousKey] = null;
      return;
    }

    if (previousValue === null) {
      this[previousKey] = nextValue;
      return;
    }

    if (nextValue > previousValue) {
      this.audioManager.playScoreIncrease();
    } else if (nextValue < previousValue) {
      this.audioManager.playScoreDecrease();
    }

    this[previousKey] = nextValue;
  }
}
