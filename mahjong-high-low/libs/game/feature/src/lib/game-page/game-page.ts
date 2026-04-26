import { Component, computed, effect, ElementRef, HostListener, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BetControls, DeckCounter, Hand, HandHistory, ScoreDisplay, SettingsPanel } from '@hbg/game-ui';
import { Bet, GameOverReason, GamePhase, HandModel, PlayerSettingsModel } from '@hbg/shared-models';
import { GameAudioManager, GameStore, SettingsService } from '@hbg/game-data-access';
import { ALLOW_SCORE_SAVE_ON_EXIT, buildDeck, MAX_RESHUFFLES } from '@hbg/shared-util-game';
import {
  getBetControlsDelay,
  getHiddenHandBaseDelay,
  getNextRoundBetControlsDelay,
  getSingleHandDealDuration,
  NEXT_ROUND_INCOMING_HIDDEN_MS,
  TRANSITION_FINISH_BUFFER_MS,
} from './game-page.animations';
import { GamePageRevealSequenceService } from './game-page-reveal-sequence.service';
import { GamePageRoundTransitionService } from './game-page-round-transition.service';
import { GamePageReshuffleSequenceService } from './game-page-reshuffle-sequence.service';
import { GamePageScoreAnimationService } from './game-page-score-animation.service';
import { GamePageUiShellService } from './game-page-ui-shell.service';

@Component({
  selector: 'lib-game-page',
  imports: [
    DecimalPipe,
    Hand,
    BetControls,
    ScoreDisplay,
    DeckCounter,
    HandHistory,
    SettingsPanel,
    ButtonModule,
  ],
  templateUrl: './game-page.html',
  styleUrls: [
    './game-page.animation-tokens.css',
    './game-page.layout.css',
    './game-page.deal.css',
    './game-page.round-transition.css',
  ],
  providers: [
    GamePageRevealSequenceService,
    GamePageRoundTransitionService,
    GamePageReshuffleSequenceService,
    GamePageScoreAnimationService,
    GamePageUiShellService,
  ],
})
export class GamePage implements OnInit, OnDestroy {
  private previousScoreDisplayValue: number | null = null;
  private previousReshuffleDrawValue: number | null = null;
  private previousReshuffleDiscardValue: number | null = null;

  private readonly router = inject(Router);
  readonly store = inject(GameStore);
  readonly settingsService = inject(SettingsService);
  readonly audioManager = inject(GameAudioManager);
  private readonly revealSequence = inject(GamePageRevealSequenceService);
  private readonly roundTransition = inject(GamePageRoundTransitionService);
  private readonly reshuffleSequence = inject(GamePageReshuffleSequenceService);
  private readonly scoreAnimation = inject(GamePageScoreAnimationService);
  private readonly uiShell = inject(GamePageUiShellService);
  steadyHandsShouldDeal = signal(true);
  revealedHandPromoted = signal(false);
  roundTransitionActive = this.roundTransition.roundTransitionActive;
  visibleHandExitActive = this.roundTransition.visibleHandExitActive;

  // ── Expose enum to template ───────────────────────────────────────────
  readonly GamePhase = GamePhase;

  // ── UI-only overlay state ─────────────────────────────────────────────
  settingsOpen = this.uiShell.settingsOpen;
  exitDialogOpen = this.uiShell.exitDialogOpen;
  exitSavePanelOpen = this.uiShell.exitSavePanelOpen;
  scoreSaved = this.uiShell.scoreSaved;
  scoreQualifiesForLeaderboard = this.uiShell.scoreQualifiesForLeaderboard;
  gameOverNameDraft = this.uiShell.gameOverNameDraft;
  maxRunNameLength = this.uiShell.maxRunNameLength;
  dealCount = signal(0);
  betControlsReady = signal(false);
  promotedHandMoveActive = this.roundTransition.promotedHandMoveActive;
  incomingHiddenEnterActive = this.roundTransition.incomingHiddenEnterActive;
  incomingVisibleTotalActive = this.roundTransition.incomingVisibleTotalActive;
  transitionOutgoingVisibleHand = this.roundTransition.transitionOutgoingVisibleHand;
  transitionPromotedVisibleHand = this.roundTransition.transitionPromotedVisibleHand;
  transitionIncomingHiddenHand = this.roundTransition.transitionIncomingHiddenHand;
  transitionOutgoingVisibleTotal = this.roundTransition.transitionOutgoingVisibleTotal;
  transitionIncomingVisibleTotal = this.roundTransition.transitionIncomingVisibleTotal;
  reshuffleSequenceActive = this.reshuffleSequence.reshuffleSequenceActive;
  reshuffleSequenceExitActive = this.reshuffleSequence.reshuffleSequenceExitActive;
  reshuffleDisplayDrawCount = this.reshuffleSequence.reshuffleDisplayDrawCount;
  reshuffleDisplayDiscardCount = this.reshuffleSequence.reshuffleDisplayDiscardCount;
  reshuffleTransitionPendingIncoming = this.reshuffleSequence.reshuffleTransitionPendingIncoming;
  reshufflePattern = this.reshuffleSequence.reshufflePattern;
  revealTileFaceUpIds = this.revealSequence.tileFaceUpIds;
  revealTileValueVisibleIds = this.revealSequence.tileValueVisibleIds;
  revealWinBannerActive = this.revealSequence.winBannerActive;
  revealHistoryReady = this.revealSequence.historyReady;
  revealValueAnimationActive = this.revealSequence.valueAnimationActive;
  revealSequenceLocked = this.revealSequence.sequenceLocked;
  scoreDisplayOverride = this.scoreAnimation.scoreDisplayOverride;
  scoreGainAnimationActive = this.scoreAnimation.scoreGainAnimationActive;
  revealTileValueOverrides = this.revealSequence.tileValueOverrides;
  revealHiddenTotalOverride = this.revealSequence.hiddenTotalOverride;
  scoreGainTravelActive = this.scoreAnimation.scoreGainTravelActive;
  scoreGainAmount = this.scoreAnimation.scoreGainAmount;
  scoreGainDirection = this.scoreAnimation.scoreGainDirection;
  scoreGainStartX = this.scoreAnimation.scoreGainStartX;
  scoreGainStartY = this.scoreAnimation.scoreGainStartY;
  scoreGainDeltaX = this.scoreAnimation.scoreGainDeltaX;
  scoreGainDeltaY = this.scoreAnimation.scoreGainDeltaY;
  revealAllTilesRevealed = this.revealSequence.allTilesRevealed;
  showVisibleHandTransition = computed<boolean>(() =>
    this.roundTransitionActive() &&
    (!!this.transitionOutgoingVisibleHand() || !!this.transitionPromotedVisibleHand()),
  );
  displayedVisibleHand = computed<HandModel | null>(() => {
    if (
      this.store.gamePhase() === GamePhase.Revealing &&
      this.revealedHandPromoted()
    ) {
      return this.store.hiddenHand();
    }

    return this.store.visibleHand();
  });
  displayedVisibleTotal = computed<number | null>(
    () => this.displayedVisibleHand()?.total ?? null,
  );
  showCenterHiddenHand = computed<boolean>(() => {
    if (this.roundTransitionActive()) {
      return false;
    }

    return !(
      this.store.gamePhase() === GamePhase.Revealing &&
      this.revealedHandPromoted()
    );
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
  revealPreWinHiddenHand = this.revealSequence.preWinHiddenHand;
  revealPostWinHiddenHand = this.revealSequence.postWinHiddenHand;
  winRevealOldTileValues = this.revealSequence.oldTileValues;
  winRevealNewTileValues = this.revealSequence.newTileValues;
  winRevealOldTotal = this.revealSequence.oldTotal;
  winRevealNewTotal = this.revealSequence.newTotal;
  winRevealAnimationRunning = this.revealSequence.animationRunning;
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
  transitionPromotedStartX = this.roundTransition.transitionPromotedStartX;
  transitionPromotedStartY = this.roundTransition.transitionPromotedStartY;
  transitionPromotedDeltaX = this.roundTransition.transitionPromotedDeltaX;
  transitionPromotedDeltaY = this.roundTransition.transitionPromotedDeltaY;
  debugMode = signal(this.DEBUG_MODE);
  private readonly freshDeckSize = buildDeck().length;
  private readonly mainStageRef =
    viewChild<ElementRef<globalThis.HTMLElement>>('mainStage');
  private readonly centerStageRef =
    viewChild<ElementRef<globalThis.HTMLElement>>('centerStage');
  private readonly hiddenHandSlotRef =
    viewChild<ElementRef<globalThis.HTMLElement>>('hiddenHandSlot');
  private readonly pageFrameRef =
    viewChild<ElementRef<globalThis.HTMLElement>>('pageFrame');
  private readonly bottomHandSlotRef =
    viewChild<ElementRef<globalThis.HTMLElement>>('bottomHandSlot');
  private readonly scoreDisplaySlotRef =
    viewChild<ElementRef<globalThis.HTMLElement>>('scoreDisplaySlot');
  private betControlsTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
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
  readonly maxReshuffles = MAX_RESHUFFLES;

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
  needsGameOverName = this.uiShell.needsGameOverName;

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
      this.betControlsTimer = globalThis.setTimeout(() => {
        this.betControlsReady.set(true);
      }, this.betControlsDelay());
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
    this.clearTransientAnimationState();
    this.reshuffleSequence.resetSequenceState();
    this.audioManager.syncMusic('none');
  }

  canLeaveGame(): boolean | Promise<boolean> {
    const hasActiveProgress = this.hasActiveProgress();
    const leaveRequest = this.uiShell.requestLeave(
      hasActiveProgress,
      ALLOW_SCORE_SAVE_ON_EXIT,
    );

    if (typeof leaveRequest === 'boolean') {
      if (leaveRequest && this.store.gamePhase() !== GamePhase.Idle) {
        this.store.exitGame();
      }

      return leaveRequest;
    }

    return leaveRequest.then((allowed) => {
      if (allowed) {
        this.store.exitGame();
      }

      return allowed;
    });
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: globalThis.BeforeUnloadEvent): void {
    if (!this.hasActiveProgress()) {
      return;
    }

    event.preventDefault();
    event.returnValue = 'Leaving now will lose your current game progress.';
  }

  // ── Handlers ──────────────────────────────────────────────────────────
  onBetPlaced(bet: 'higher' | 'lower') {
    if (this.store.gamePhase() !== GamePhase.Betting) return;
    this.handleButtonInteraction();
    const hiddenHandBeforeBet = this.store.hiddenHand();
    if (!hiddenHandBeforeBet) return;
    const scoreBeforeBet = this.store.currentScore();

    this.revealSequence.clearTimers();
    this.resetRevealAnimationState();
    this.revealedHandPromoted.set(false);

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

    if (
      this.store.gamePhase() === GamePhase.Revealing &&
      this.revealedHandPromoted()
    ) {
      this.advanceToNextHiddenHand();
      return;
    }

    const outgoingVisibleHand = this.store.visibleHand();
    const promotedVisibleHand = this.store.hiddenHand();
    if (!outgoingVisibleHand || !promotedVisibleHand) {
      return;
    }

    this.clearTransientAnimationState();
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
      this.reshuffleSequence.startReshuffleSequence(drawBefore, discardBefore, drawAfterReshuffle, discardAfterReshuffle, () => {
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
    this.handleButtonInteraction();
    this.settingsService.update(partial);
  }

  onPlayAgain() {
    this.handleButtonInteraction();
    this.uiShell.resetScoreSaved();
    this.finishRoundTransition();
    this.clearTransientAnimationState();
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
    this.uiShell.resetScoreSaved();
    this.store.exitGame();
    this.exitDialogOpen.set(false);
    if (this.uiShell.resolvePendingLeave(true)) {
      return;
    }
    this.router.navigate(['/']);
  }

  private clearBetControlsTimer(): void {
    if (this.betControlsTimer !== null) {
      globalThis.clearTimeout(this.betControlsTimer);
      this.betControlsTimer = null;
    }
  }

  private startRoundTransition(deferIncomingHidden = false): void {
    this.roundTransition.startRoundTransition({
      deferIncomingHidden,
      onVisibleExit: () => this.audioManager.playTileOut(),
      onPromote: () => this.audioManager.playTileIn(this.store.handSize()),
      onIncoming: () => this.audioManager.playTileIn(this.store.handSize()),
      onFinish: () => this.finishRoundTransition(),
    });
  }

  private startRevealPromotionTransition(): void {
    const outgoingVisibleHand = this.store.visibleHand();
    const promotedVisibleHand = this.store.hiddenHand();
    if (!outgoingVisibleHand || !promotedVisibleHand) {
      this.revealedHandPromoted.set(true);
      return;
    }

    this.measureRoundTransition();
    this.roundTransition.prepareTransition(outgoingVisibleHand, promotedVisibleHand);
    this.steadyHandsShouldDeal.set(false);
    this.roundTransition.startPromotionOnlyTransition({
      onVisibleExit: () => this.audioManager.playTileOut(),
      onPromote: () => this.audioManager.playTileIn(this.store.handSize()),
      onFinish: () => {
        this.finishRoundTransition();
        this.revealedHandPromoted.set(true);
        this.store.checkForPendingReshuffleGameOver();
      },
    });
  }

  private finishRoundTransition(): void {
    this.clearAnimationTimers();
    this.roundTransition.reset();
    this.steadyHandsShouldDeal.set(false);
  }

  private measureRoundTransition(): void {
    this.roundTransition.measureRoundTransition(
      this.mainStageRef()?.nativeElement,
      this.hiddenHandSlotRef()?.nativeElement,
      this.bottomHandSlotRef()?.nativeElement,
    );
  }

  private clearAnimationTimers(): void {
    this.roundTransition.clearTimers();
  }

  private executeNextHandTransition(
    outgoingVisibleHand: HandModel,
    promotedVisibleHand: HandModel,
    deferIncomingHidden = false,
  ): void {
    this.measureRoundTransition();
    this.roundTransition.prepareTransition(outgoingVisibleHand, promotedVisibleHand);
    this.steadyHandsShouldDeal.set(false);
    this.betControlsDelayMs.set(getNextRoundBetControlsDelay());

    if (deferIncomingHidden) {
      this.reshuffleTransitionPendingIncoming.set(true);
      this.startRoundTransition(true);
      return;
    }

    this.store.nextHand();
    this.roundTransition.setIncomingHiddenHand(this.store.hiddenHand());
    this.startRoundTransition(false);
  }

  private completeDeferredIncomingAfterReshuffle(): void {
    if (!this.reshuffleTransitionPendingIncoming()) {
      return;
    }

    this.reshuffleTransitionPendingIncoming.set(false);
    this.store.nextHand();
    this.reshuffleDisplayDrawCount.set(this.store.drawPile().length);
    this.reshuffleDisplayDiscardCount.set(this.store.discard().length);
    this.roundTransition.setIncomingHiddenHand(this.store.hiddenHand());
    this.roundTransition.setIncomingPhaseIdle();

    if (!this.roundTransitionActive()) {
      return;
    }

    this.roundTransition.activateDeferredIncoming({
      finishDelay: NEXT_ROUND_INCOMING_HIDDEN_MS + TRANSITION_FINISH_BUFFER_MS,
      onIncoming: () => this.audioManager.playTileIn(this.store.handSize()),
      onFinish: () => {
        this.finishRoundTransition();
        this.reshuffleSequence.clearDisplayCountsIfSynced(
          this.store.drawPile().length,
          this.store.discard().length,
        );
      },
    });
  }

  private resetRevealAnimationState(): void {
    this.revealSequence.reset();
    this.scoreAnimation.reset();
    this.revealedHandPromoted.set(false);
  }

  private startHiddenHandRevealSequence(
    preWinHand: HandModel,
    postWinHand: HandModel,
    scoreBefore: number,
    scoreAfter: number,
  ): void {
    this.revealSequence.startHiddenHandRevealSequence({
      animationsEnabled: this.settingsService.settings().animationsEnabled,
      scoreBefore,
      scoreAfter,
      lastResult: this.store.lastResult(),
      preWinHand,
      postWinHand,
      setScoreDisplayOverride: (value) => this.scoreDisplayOverride.set(value),
      startScoreGainAnimation: (startScore, endScore, onDone) =>
        this.startScoreGainAnimation(startScore, endScore, onDone),
      playTileFlip: () => this.audioManager.playTileFlip(),
      playWin: () => this.audioManager.playWin(),
      playLose: () => this.audioManager.playLose(),
      playCardValueChange: () => this.audioManager.playCardValueChange(),
      onRevealSettled: () => this.startRevealPromotionTransition(),
    });
  }

  private advanceToNextHiddenHand(): void {
    this.clearBetControlsTimer();
    this.debugForceReshuffleNextHand.set(false);
    this.store.nextHand();
    this.resetRevealAnimationState();
    this.revealedHandPromoted.set(false);
    this.steadyHandsShouldDeal.set(false);
    this.betControlsDelayMs.set(
      getBetControlsDelay(this.settingsService.settings().handSize),
    );

    const incomingHiddenHand = this.store.hiddenHand();
    if (this.store.gamePhase() !== GamePhase.Betting || !incomingHiddenHand) {
      return;
    }

    this.roundTransition.measureRoundTransition(
      this.mainStageRef()?.nativeElement,
      this.centerStageRef()?.nativeElement,
      this.bottomHandSlotRef()?.nativeElement,
    );
    this.roundTransition.prepareIncomingOnlyTransition(incomingHiddenHand);
    this.roundTransition.startIncomingOnlyTransition({
      finishDelay: NEXT_ROUND_INCOMING_HIDDEN_MS + TRANSITION_FINISH_BUFFER_MS,
      onIncoming: () => this.audioManager.playTileIn(this.store.handSize()),
      onFinish: () => this.finishRoundTransition(),
    });
  }

  private startScoreGainAnimation(
    scoreBefore: number,
    scoreAfter: number,
    onDone: () => void,
  ): void {
    this.scoreAnimation.measureScoreGainTransition(
      this.pageFrameRef()?.nativeElement,
      this.centerStageRef()?.nativeElement,
      this.scoreDisplaySlotRef()?.nativeElement,
    );
    this.scoreAnimation.startScoreGainAnimation({
      animationsEnabled: this.settingsService.settings().animationsEnabled,
      scoreBefore,
      scoreAfter,
      onDone,
      onIncrease: () => this.audioManager.playScoreIncrease(),
      onDecrease: () => this.audioManager.playScoreDecrease(),
    });
  }

  openExitDialog(): void {
    this.handleButtonInteraction();

    if (!this.hasActiveProgress()) {
      this.onExitGame();
      return;
    }

    if (ALLOW_SCORE_SAVE_ON_EXIT) {
      if (this.scoreQualifiesForLeaderboard()) {
        this.uiShell.openExitSavePanel();
        return;
      }

      this.exitDialogOpen.set(true);
      return;
    }

    this.exitDialogOpen.set(true);
  }

  closeExitDialog(): void {
    this.handleButtonInteraction();
    this.uiShell.resolvePendingLeave(false);
  }

  onExitSavePanelClosed(): void {
    this.handleButtonInteraction();
    this.uiShell.cancelExitSavePanel();
    this.uiShell.resolvePendingLeave(false);
  }

  onVisibleHandDealStarted(): void {
    this.audioManager.playTileIn(this.store.handSize());
  }

  onHiddenHandDealStarted(): void {
    this.audioManager.playTileIn(this.store.handSize());
  }

  onSettingsPanelClosed(): void {
    this.handleButtonInteraction();
    this.settingsOpen.set(false);
  }

  onSettingsOpened(): void {
    this.handleButtonInteraction();
    this.settingsOpen.set(true);
  }

  onGameOverNameInput(value: string): void {
    this.uiShell.onGameOverNameInput(value);
  }

  onSaveScoreWithName(): void {
    this.handleButtonInteraction();
    this.uiShell.saveScoreWithName();

    if (this.exitSavePanelOpen() && this.scoreSaved()) {
      this.onExitGame();
    }
  }

  private handleButtonInteraction(): void {
    this.audioManager.registerInteraction();
    this.audioManager.playButtonClick();
  }

  private hasActiveProgress(): boolean {
    const phase = this.store.gamePhase();
    return phase !== GamePhase.Idle && phase !== GamePhase.GameOver;
  }

  private clearTransientAnimationState(): void {
    this.clearAnimationTimers();
    this.revealSequence.clearTimers();
    this.reshuffleTransitionPendingIncoming.set(false);
    this.resetRevealAnimationState();
    this.reshuffleSequence.resetSequenceState();
    this.reshuffleSequence.clearDisplayCountsIfSynced(
      this.store.drawPile().length,
      this.store.discard().length,
    );
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
