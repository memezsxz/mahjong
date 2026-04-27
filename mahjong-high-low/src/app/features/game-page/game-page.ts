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
/**
 * Container component for the full in-run game experience.
 *
 * Sequence overview:
 * 1. `startFreshGame()` seeds the first visible and hidden hands.
 * 2. `betControlsReady` waits for the initial or next-round deal timing.
 * 3. `onBetPlaced()` resolves the bet in store, then starts the staged hidden
 *    hand reveal, score animation, and honor-tile value update flow.
 * 4. `onNextHand()` either promotes the revealed hand into the visible slot or
 *    runs the normal next-round transition, optionally pausing for reshuffle UI.
 * 5. Game-over and settings overlays are handled through `GamePageUiShellService`
 *    so the main component can stay focused on round orchestration.
 */
export class GamePage implements OnInit, OnDestroy {
  private static readonly MOBILE_SIDEBAR_BREAKPOINT_PX = 1024;
  private static readonly MOBILE_SIDEBAR_TOGGLE_THRESHOLD_PX = 56;
  private static readonly MOBILE_SIDEBAR_MAX_DRAG_PX = 640;
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
  readonly mobileSidebarEnabled = signal(false);
  readonly mobileSidebarOpen = signal(false);
  readonly mobileSidebarDragActive = signal(false);
  readonly mobileSidebarDragOffset = signal(0);
  private activeSidebarPointerId: number | null = null;
  private sidebarDragStartY = 0;
  private sidebarDragStartedOpen = false;
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

  /** Wires the bet-controls timer and game-page audio bindings. */
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
        // Later rounds wait only for the incoming hidden-hand entry buffer.
        this.betControlsTimer = globalThis.setTimeout(() => {
          this.betControlsReady.set(true);
        }, getNextRoundBetControlsDelay());
        return;
      }

      // The first round waits for both hands to finish their initial staged deal.
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

  /** Starts a new run when the page is entered. */
  ngOnInit(): void {
    this.syncMobileSidebarMode();
    this.startFreshGame();
  }

  /** Clears timers, transient UI state, and music when the page is destroyed. */
  ngOnDestroy(): void {
    this.clearBetControlsTimer();
    this.clearTransientAnimationState();
    this.reshuffleSequence.resetSequenceState();
    this.audioState.stopMusic();
    this.resetMobileSidebarDrag();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncMobileSidebarMode();
  }

  @HostListener('window:pointermove', ['$event'])
  onWindowPointerMove(event: globalThis.PointerEvent): void {
    if (
      !this.mobileSidebarEnabled() ||
      !this.mobileSidebarDragActive() ||
      event.pointerId !== this.activeSidebarPointerId
    ) {
      return;
    }

    const rawDelta = event.clientY - this.sidebarDragStartY;
    const clampedDelta = this.sidebarDragStartedOpen
      ? Math.min(GamePage.MOBILE_SIDEBAR_MAX_DRAG_PX, Math.max(0, rawDelta))
      : Math.max(-GamePage.MOBILE_SIDEBAR_MAX_DRAG_PX, Math.min(0, rawDelta));

    this.mobileSidebarDragOffset.set(clampedDelta);
    event.preventDefault();
  }

  @HostListener('window:pointerup', ['$event'])
  onWindowPointerUp(event: globalThis.PointerEvent): void {
    this.finishMobileSidebarDrag(event);
  }

  @HostListener('window:pointercancel', ['$event'])
  onWindowPointerCancel(event: globalThis.PointerEvent): void {
    this.finishMobileSidebarDrag(event);
  }

  /** Router guard hook used when leaving the page through navigation. */
  canLeaveGame(): boolean | Promise<boolean> {
    const hasActiveProgress = this.hasActiveProgress();
    const leaveRequest = this.uiShell.requestLeave(hasActiveProgress);

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
  /**
   * Resolves the selected bet and starts the reveal flow using a snapshot of the
   * hidden hand from before the store mutates it for honor-tile value changes.
   */
  onBetPlaced(bet: 'higher' | 'lower'): void {
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

  /**
   * Advances the run after the reveal has settled or from the regular betting
   * state if the player is already ready for the next hand.
   */
  onNextHand(): void {
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
      // Keep the outgoing/promotion motion running, but delay the incoming hand
      // until the reshuffle sidebar presentation has completed.
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

  /** Developer-only helper used to exercise the reshuffle presentation path. */
  onDebugForceReshuffle(): void {
    // if (!this.debugMode()) return;
    this.handleButtonInteraction();
    this.debugForceReshuffleNextHand.set(true);
    if (this.store.gamePhase() === GamePhase.Revealing) {
      this.onNextHand();
    }
  }

  /** Persists landing-page and in-game settings changes immediately. */
  onSettingsChanged(partial: Partial<PlayerSettingsModel>): void {
    this.handleButtonInteraction();
    this.settingsService.update(partial);
  }

  /** Resets transient UI state and starts a fresh run from the game-over screen. */
  onPlayAgain(): void {
    this.handleButtonInteraction();
    this.resetPageForNewGame();
    this.startFreshGame();
    this.incrementDealCount();
  }

  /** Leaves the current run and returns to the landing page. */
  onExitGame(): void {
    this.handleButtonInteraction();
    this.uiShell.resetScoreSaved();
    this.store.exitGame();
    this.exitDialogOpen.set(false);
    if (this.uiShell.resolvePendingLeave(true)) {
      return;
    }
    this.router.navigate(['/']);
  }

  /** Clears the pending timer that reveals the bet controls. */
  private clearBetControlsTimer(): void {
    if (this.betControlsTimer !== null) {
      globalThis.clearTimeout(this.betControlsTimer);
      this.betControlsTimer = null;
    }
  }

  /** Starts a brand-new run and re-enables the initial two-hand deal treatment. */
  private startFreshGame(): void {
    this.steadyHandsShouldDeal.set(true);
    this.store.startGame();
  }

  /** Resets page-only state before replaying the initial game entry flow. */
  private resetPageForNewGame(): void {
    this.uiShell.resetScoreSaved();
    this.finishRoundTransition();
    this.clearTransientAnimationState();
    this.clearBetControlsTimer();
  }

  /** Bumps the deal key used to replay the initial hand-deal animation. */
  private incrementDealCount(): void {
    this.dealCount.update((count) => count + 1);
  }

  /** Starts the standard next-round transition timing and audio cues. */
  private startRoundTransition(deferIncomingHidden = false): void {
    this.roundTransition.startRoundTransition({
      deferIncomingHidden,
      onVisibleExit: () => this.audioManager.playTileOut(),
      onPromote: () => this.audioManager.playTileIn(this.store.handSize()),
      onIncoming: () => this.audioManager.playTileIn(this.store.handSize()),
      onFinish: () => this.finishRoundTransition(),
    });
  }

  /**
   * Promotes the revealed hidden hand into the visible slot once the reveal has
   * settled, then checks whether the run should end because of pending reshuffle
   * exhaustion.
   */
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

  /** Clears the active transition overlay and returns to steady layout state. */
  private finishRoundTransition(): void {
    this.clearAnimationTimers();
    this.roundTransition.reset();
    this.steadyHandsShouldDeal.set(false);
  }

  /** Measures the center-to-bottom travel path for the promoted hand overlay. */
  private measureRoundTransition(): void {
    this.roundTransition.measureRoundTransition(
      this.mainStageRef()?.nativeElement,
      this.hiddenHandSlotRef()?.nativeElement,
      this.bottomHandSlotRef()?.nativeElement,
    );
  }

  /** Clears timers owned by the round-transition service. */
  private clearAnimationTimers(): void {
    this.roundTransition.clearTimers();
  }

  /**
   * Runs the next-hand transition and, when possible, asks the store for the new
   * hidden hand before the incoming phase begins.
   */
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

  /**
   * Completes the hidden-hand entrance after a reshuffle sequence has finished
   * and the store has advanced to the newly dealt next hand.
   */
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

  /** Clears reveal and score animation state before a new reveal starts. */
  private resetRevealAnimationState(): void {
    this.revealSequence.reset();
    this.scoreAnimation.reset();
    this.revealedHandPromoted.set(false);
  }

  /** Delegates the reveal lifecycle to the reveal sequence service. */
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

  /**
   * Deals only the next hidden hand after the revealed hand has already been
   * promoted into the visible slot.
   */
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

    this.measureRoundTransition();
    this.roundTransition.prepareIncomingOnlyTransition(incomingHiddenHand);
    this.roundTransition.startIncomingOnlyTransition({
      finishDelay: NEXT_ROUND_INCOMING_HIDDEN_MS + TRANSITION_FINISH_BUFFER_MS,
      onIncoming: () => this.audioManager.playTileIn(this.store.handSize()),
      onFinish: () => this.finishRoundTransition(),
    });
  }

  /** Measures and starts the score-change travel animation. */
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

  /** Opens the exit confirmation flow or exits immediately if no run is active. */
  openExitDialog(): void {
    this.handleButtonInteraction();
    const exitState = this.uiShell.openExitFlow(this.hasActiveProgress());
    if (exitState === 'exit-now') {
      this.onExitGame();
    }
  }

  /** Closes the exit confirmation dialog without leaving the page. */
  closeExitDialog(): void {
    this.handleButtonInteraction();
    this.uiShell.dismissExitDialog();
  }

  /** Closes the leaderboard-save overlay shown from an exit flow. */
  onExitSavePanelClosed(): void {
    this.handleButtonInteraction();
    this.uiShell.dismissExitSavePanel();
  }

  /** Plays the initial visible-hand slide cue when the deal animation starts. */
  onVisibleHandDealStarted(): void {
    this.audioManager.playTileIn(this.store.handSize());
  }

  /** Plays the initial hidden-hand slide cue when the deal animation starts. */
  onHiddenHandDealStarted(): void {
    this.audioManager.playTileIn(this.store.handSize());
  }

  /** Closes the in-game settings panel. */
  onSettingsPanelClosed(): void {
    this.handleButtonInteraction();
    this.settingsOpen.set(false);
  }

  /** Opens the in-game settings panel. */
  onSettingsOpened(): void {
    this.handleButtonInteraction();
    this.mobileSidebarOpen.set(false);
    this.settingsOpen.set(true);
  }

  onMobileSidebarPointerDown(event: globalThis.PointerEvent): void {
    if (!this.mobileSidebarEnabled()) {
      return;
    }

    this.activeSidebarPointerId = event.pointerId;
    this.sidebarDragStartY = event.clientY;
    this.sidebarDragStartedOpen = this.mobileSidebarOpen();
    this.mobileSidebarDragActive.set(true);
    this.mobileSidebarDragOffset.set(0);
    event.preventDefault();
  }

  /** Mirrors game-over name input into the UI shell state. */
  onGameOverNameInput(value: string): void {
    this.uiShell.onGameOverNameInput(value);
  }

  /** Saves a qualifying score and exits if the save originated from exit flow. */
  onSaveScoreWithName(): void {
    this.handleButtonInteraction();
    if (this.uiShell.saveScoreWithNameAndCheckExit()) {
      this.onExitGame();
    }
  }

  /** Unlocks audio on interaction and plays the shared button click sound. */
  private handleButtonInteraction(): void {
    this.audioManager.registerInteraction();
    this.audioManager.playButtonClick();
  }

  /** Returns whether the user is currently in an active run that can be lost. */
  private hasActiveProgress(): boolean {
    const phase = this.store.gamePhase();
    return phase !== GamePhase.Idle && phase !== GamePhase.GameOver;
  }

  /** Clears all transient animation state before a new round or fresh game. */
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

  private syncMobileSidebarMode(): void {
    const width = globalThis.window?.innerWidth ?? GamePage.MOBILE_SIDEBAR_BREAKPOINT_PX;
    const mobileMode = width < GamePage.MOBILE_SIDEBAR_BREAKPOINT_PX;
    this.mobileSidebarEnabled.set(mobileMode);

    if (!mobileMode) {
      this.mobileSidebarOpen.set(false);
      this.resetMobileSidebarDrag();
    }
  }

  private finishMobileSidebarDrag(event: globalThis.PointerEvent): void {
    if (
      !this.mobileSidebarDragActive() ||
      event.pointerId !== this.activeSidebarPointerId
    ) {
      return;
    }

    const totalDelta = event.clientY - this.sidebarDragStartY;
    const shouldOpen = this.sidebarDragStartedOpen
      ? totalDelta < GamePage.MOBILE_SIDEBAR_TOGGLE_THRESHOLD_PX
      : totalDelta < -GamePage.MOBILE_SIDEBAR_TOGGLE_THRESHOLD_PX;

    this.mobileSidebarOpen.set(shouldOpen);
    this.resetMobileSidebarDrag();
  }

  private resetMobileSidebarDrag(): void {
    this.activeSidebarPointerId = null;
    this.sidebarDragStartY = 0;
    this.sidebarDragStartedOpen = false;
    this.mobileSidebarDragActive.set(false);
    this.mobileSidebarDragOffset.set(0);
  }
}
