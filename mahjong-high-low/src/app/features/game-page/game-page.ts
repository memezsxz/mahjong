import { Component, computed, effect, ElementRef, HostListener, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BetControls, DeckCounter, Hand, HandHistory, ScoreDisplay, SettingsPanel } from '@hbg/game-ui';
import { Bet, GamePhase, HandModel, PlayerSettingsModel } from '@hbg/shared-models';
import { GameAudioManager, GameStore, SettingsService } from '@hbg/game-data-access';
import { buildDeck, MAX_RESHUFFLES } from '@hbg/shared-util-game';
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
import { GamePageAudioStateService } from './game-page-audio-state.service';
import { resolveNextHandPlan } from './game-page-next-hand-plan';
import { GamePageUiShellService } from './game-page-ui-shell.service';
import { GamePageViewStateService } from './game-page-view-state.service';

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
    GamePageAudioStateService,
    GamePageUiShellService,
    GamePageViewStateService,
  ],
})
export class GamePage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly store = inject(GameStore);
  readonly settingsService = inject(SettingsService);
  readonly audioManager = inject(GameAudioManager);
  private readonly revealSequence = inject(GamePageRevealSequenceService);
  private readonly roundTransition = inject(GamePageRoundTransitionService);
  private readonly reshuffleSequence = inject(GamePageReshuffleSequenceService);
  private readonly scoreAnimation = inject(GamePageScoreAnimationService);
  private readonly audioState = inject(GamePageAudioStateService);
  private readonly uiShell = inject(GamePageUiShellService);
  private readonly viewState = inject(GamePageViewStateService);
  steadyHandsShouldDeal = signal(true);
  revealedHandPromoted = this.viewState.revealedHandPromoted;
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
  showVisibleHandTransition = this.viewState.showVisibleHandTransition;
  displayedVisibleHand = this.viewState.displayedVisibleHand;
  displayedVisibleTotal = this.viewState.displayedVisibleTotal;
  showCenterHiddenHand = this.viewState.showCenterHiddenHand;
  revealResultBannerText = this.viewState.revealResultBannerText;
  revealPreWinHiddenHand = this.revealSequence.preWinHiddenHand;
  revealPostWinHiddenHand = this.revealSequence.postWinHiddenHand;
  winRevealOldTileValues = this.revealSequence.oldTileValues;
  winRevealNewTileValues = this.revealSequence.newTileValues;
  winRevealOldTotal = this.revealSequence.oldTotal;
  winRevealNewTotal = this.revealSequence.newTotal;
  winRevealAnimationRunning = this.revealSequence.animationRunning;
  visibleWinStreak = this.viewState.visibleWinStreak;
  debugForceReshuffleNextHand = signal(false);
  // DEV toggle: set true to show debug controls for forcing reshuffle flow.
  // private readonly DEBUG_MODE = true;
  transitionPromotedStartX = this.roundTransition.transitionPromotedStartX;
  transitionPromotedStartY = this.roundTransition.transitionPromotedStartY;
  transitionPromotedDeltaX = this.roundTransition.transitionPromotedDeltaX;
  transitionPromotedDeltaY = this.roundTransition.transitionPromotedDeltaY;
  // debugMode = signal(this.DEBUG_MODE);
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
  // ── Deal animation timing ─────────────────────────────────────────────
  readonly singleHandDealDuration = computed(() => {
    return getSingleHandDealDuration(this.settingsService.settings().handSize);
  });
  readonly hiddenHandBaseDelay = computed(() =>
    getHiddenHandBaseDelay(this.settingsService.settings().handSize),
  );

  // ── Derived deck counts ───────────────────────────────────────────────
  drawCount = computed(() => this.store.drawPile().length);
  discardCount = computed(() => this.store.discard().length);
  readonly maxReshuffles = MAX_RESHUFFLES;

  // ── Game over reason → human-readable copy ────────────────────────────
  gameOverMessage = this.viewState.gameOverMessage;
  needsGameOverName = this.uiShell.needsGameOverName;

  // ── Last 5 rounds for the sidebar history ────────────────────────────
  handHistory = this.viewState.handHistory;

  constructor() {
    effect(() => {
      const phase = this.store.gamePhase();
      const visibleHand = this.store.visibleHand();
      const hiddenHand = this.store.hiddenHand();
      const transitionActive = this.roundTransitionActive();
      const initialDeal = this.steadyHandsShouldDeal();
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

      if (!initialDeal) {
        this.betControlsTimer = globalThis.setTimeout(() => {
          this.betControlsReady.set(true);
        }, getNextRoundBetControlsDelay());
        return;
      }

      this.betControlsTimer = globalThis.setTimeout(() => {
        this.betControlsReady.set(true);
      }, getBetControlsDelay(this.settingsService.settings().handSize));
    });

    this.audioState.registerEffects({
      scoreDisplayValue: this.scoreDisplayOverride,
      reshuffleDrawValue: this.reshuffleDisplayDrawCount,
      reshuffleDiscardValue: this.reshuffleDisplayDiscardCount,
      gamePhase: this.store.gamePhase,
      isPaused: this.store.isPaused,
      musicEnabled: () => this.settingsService.settings().musicEnabled,
    });
  }

  ngOnInit() {
    this.startFreshGame();
  }

  ngOnDestroy() {
    this.clearBetControlsTimer();
    this.clearTransientAnimationState();
    this.reshuffleSequence.resetSequenceState();
    this.audioState.stopMusic();
  }

  canLeaveGame(): boolean | Promise<boolean> {
    const hasActiveProgress = this.hasActiveProgress();
    const leaveRequest = this.uiShell.requestLeave(
      hasActiveProgress);

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
    const nextHandPlan = resolveNextHandPlan({
      drawBefore,
      discardBefore,
      handSize: this.store.handSize(),
      freshDeckSize: this.freshDeckSize,
      forceReshuffle: this.debugForceReshuffleNextHand(),
    });

    if (nextHandPlan.kind === 'reshuffle') {
      this.reshuffleSequence.startReshuffleSequence(
        drawBefore,
        discardBefore,
        nextHandPlan.drawAfterReshuffle,
        nextHandPlan.discardAfterReshuffle,
        () => {
          this.completeDeferredIncomingAfterReshuffle();
        },
      );
      this.debugForceReshuffleNextHand.set(false);
      this.executeNextHandTransition(outgoingVisibleHand, promotedVisibleHand, true);
      return;
    }

    this.debugForceReshuffleNextHand.set(false);
    this.executeNextHandTransition(outgoingVisibleHand, promotedVisibleHand);
  }

  onDebugForceReshuffle() {
    // if (!this.debugMode()) return;
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
    this.resetPageForNewGame();
    this.startFreshGame();
    this.incrementDealCount();
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

  private startFreshGame(): void {
    this.steadyHandsShouldDeal.set(true);
    this.store.startGame();
  }

  private resetPageForNewGame(): void {
    this.uiShell.resetScoreSaved();
    this.finishRoundTransition();
    this.clearTransientAnimationState();
    this.clearBetControlsTimer();
  }

  private incrementDealCount(): void {
    this.dealCount.update((count) => count + 1);
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
    const exitState = this.uiShell.openExitFlow(
      this.hasActiveProgress(),
    );
    if (exitState === 'exit-now') {
      this.onExitGame();
    }
  }

  closeExitDialog(): void {
    this.handleButtonInteraction();
    this.uiShell.dismissExitDialog();
  }

  onExitSavePanelClosed(): void {
    this.handleButtonInteraction();
    this.uiShell.dismissExitSavePanel();
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
    if (this.uiShell.saveScoreWithNameAndCheckExit()) {
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
}
