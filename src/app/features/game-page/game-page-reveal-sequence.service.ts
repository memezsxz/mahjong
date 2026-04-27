import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import { HandModel } from '@hbg/shared-models';
import {
  HIDDEN_REVEAL_POST_TILE_MS,
  HIDDEN_REVEAL_SETTLE_MS,
  HIDDEN_REVEAL_TOTAL_STEP_MS,
  HIDDEN_REVEAL_VALUE_DELAY_MS,
  WIN_BANNER_SHOW_MS,
  WIN_NO_ANIMATION_RESULT_PAUSE_MS,
  WIN_PRE_VALUE_DELAY_MS,
  WIN_POST_VALUE_SETTLE_MS,
  WIN_VALUE_STEP_MS,
} from './game-page.animations';

type RevealResult = 'win' | 'lose' | null;

interface StartHiddenHandRevealSequenceOptions {
  animationsEnabled: boolean;
  scoreBefore: number;
  scoreAfter: number;
  lastResult: RevealResult;
  preWinHand: HandModel;
  postWinHand: HandModel;
  setScoreDisplayOverride: (value: number | null) => void;
  startScoreGainAnimation: (scoreBefore: number, scoreAfter: number, onDone: () => void) => void;
  playTileFlip: () => void;
  playWin: () => void;
  playLose: () => void;
  playCardValueChange: () => void;
  onRevealSettled: () => void;
}

/**
 * Coordinates the hidden-hand reveal lifecycle during the `Revealing` phase.
 *
 * This covers three connected pieces of UI:
 * 1. flipping and exposing the hidden hand,
 * 2. animating score gain or loss,
 * 3. applying any post-result tile value changes before the next-hand flow.
 */
@Injectable()
export class GamePageRevealSequenceService implements OnDestroy {
  readonly tileFaceUpIds = signal<string[] | null>(null);
  readonly tileValueVisibleIds = signal<string[] | null>(null);
  readonly winBannerActive = signal(false);
  readonly historyReady = signal(false);
  readonly valueAnimationActive = signal(false);
  readonly sequenceLocked = signal(false);
  readonly tileValueOverrides = signal<Record<string, number> | null>(null);
  readonly hiddenTotalOverride = signal<number | null>(null);
  readonly preWinHiddenHand = signal<HandModel | null>(null);
  readonly postWinHiddenHand = signal<HandModel | null>(null);

  readonly allTilesRevealed = computed<boolean>(() => {
    const hand = this.postWinHiddenHand();
    const valueVisibleIds = this.tileValueVisibleIds();
    if (!hand || valueVisibleIds === null) return true;
    return valueVisibleIds.length >= hand.tiles.length;
  });

  readonly oldTileValues = computed<Record<string, number> | null>(() => {
    const hand = this.preWinHiddenHand();
    if (!hand) return null;
    return Object.fromEntries(hand.tiles.map((tile) => [tile.id, tile.currentValue]));
  });

  readonly newTileValues = computed<Record<string, number> | null>(() => {
    const hand = this.postWinHiddenHand();
    if (!hand) return null;
    return Object.fromEntries(hand.tiles.map((tile) => [tile.id, tile.currentValue]));
  });

  readonly oldTotal = computed<number | null>(() => this.preWinHiddenHand()?.total ?? null);
  readonly newTotal = computed<number | null>(() => this.postWinHiddenHand()?.total ?? null);
  readonly animationRunning = computed<boolean>(() => this.sequenceLocked());

  private readonly revealTimers = new Set<ReturnType<typeof globalThis.setTimeout>>();

  ngOnDestroy(): void {
    this.clearTimers();
  }

  /** Clears every queued reveal timer. */
  clearTimers(): void {
    for (const timer of this.revealTimers) {
      globalThis.clearTimeout(timer);
    }
    this.revealTimers.clear();
  }

  /** Resets reveal-only state before a new reveal or when leaving the page. */
  reset(): void {
    this.winBannerActive.set(false);
    this.historyReady.set(false);
    this.valueAnimationActive.set(false);
    this.sequenceLocked.set(false);
    this.tileFaceUpIds.set(null);
    this.tileValueVisibleIds.set(null);
    this.tileValueOverrides.set(null);
    this.hiddenTotalOverride.set(null);
    this.preWinHiddenHand.set(null);
    this.postWinHiddenHand.set(null);
  }

  /**
   * Starts the reveal sequence from face-down hidden hand to settled result.
   *
   * When animations are disabled, the same logical steps still happen, but the
   * staged timing collapses into immediate state changes with only the minimum
   * pause needed to preserve result readability.
   */
  startHiddenHandRevealSequence(options: StartHiddenHandRevealSequenceOptions): void {
    const {
      animationsEnabled,
      scoreBefore,
      scoreAfter,
      preWinHand,
      postWinHand,
      setScoreDisplayOverride,
      startScoreGainAnimation,
      playTileFlip,
      lastResult,
      playWin,
      playLose,
      playCardValueChange,
      onRevealSettled,
    } = options;

    this.preWinHiddenHand.set(preWinHand);
    this.postWinHiddenHand.set(postWinHand);

    if (!animationsEnabled) {
      const revealValues = Object.fromEntries(
        preWinHand.tiles.map((tile) => [tile.id, tile.currentValue]),
      );
      this.sequenceLocked.set(true);
      this.tileFaceUpIds.set(preWinHand.tiles.map((tile) => tile.id));
      this.tileValueVisibleIds.set(preWinHand.tiles.map((tile) => tile.id));
      this.tileValueOverrides.set(revealValues);
      this.hiddenTotalOverride.set(preWinHand.total);
      if (scoreBefore !== scoreAfter) {
        setScoreDisplayOverride(scoreBefore);
      }
      this.queueTimer(() => {
        startScoreGainAnimation(scoreBefore, scoreAfter, () => {
          this.startWinRevealAnimation({
            animationsEnabled,
            preWinHand,
            postWinHand,
            lastResult,
            playWin,
            playLose,
            playCardValueChange,
            onRevealSettled,
          });
        });
      }, 0);
      return;
    }

    const revealValues = Object.fromEntries(
      preWinHand.tiles.map((tile) => [tile.id, tile.currentValue]),
    );

    this.sequenceLocked.set(true);
    this.tileFaceUpIds.set([]);
    this.tileValueVisibleIds.set([]);
    this.tileValueOverrides.set(revealValues);
    this.hiddenTotalOverride.set(0);
    if (scoreBefore !== scoreAfter) {
      setScoreDisplayOverride(scoreBefore);
    }

    let runningTotal = 0;
    let cursorMs = 0;

    // Reveal tiles one by one, then roll the subtotal so the hidden hand reads
    // like a staged deal rather than a single abrupt state swap.
    preWinHand.tiles.forEach((tile) => {
      const revealDelay = cursorMs;
      this.queueTimer(() => {
        const currentFaceUp = this.tileFaceUpIds() ?? [];
        this.tileFaceUpIds.set([...currentFaceUp, tile.id]);
        playTileFlip();
      }, revealDelay);

      const showValueDelay = revealDelay + HIDDEN_REVEAL_VALUE_DELAY_MS;
      this.queueTimer(() => {
        const currentVisible = this.tileValueVisibleIds() ?? [];
        this.tileValueVisibleIds.set([...currentVisible, tile.id]);
      }, showValueDelay);

      const nextTotal = runningTotal + tile.currentValue;
      this.queueTimer(() => {
        this.hiddenTotalOverride.set(nextTotal);
      }, showValueDelay + HIDDEN_REVEAL_TOTAL_STEP_MS);

      runningTotal = nextTotal;
      cursorMs = showValueDelay + HIDDEN_REVEAL_TOTAL_STEP_MS + HIDDEN_REVEAL_POST_TILE_MS;
    });

    const handRevealDoneMs = cursorMs + HIDDEN_REVEAL_SETTLE_MS;
    this.queueTimer(() => {
      startScoreGainAnimation(scoreBefore, scoreAfter, () => {
        this.startWinRevealAnimation({
          animationsEnabled,
          preWinHand,
          postWinHand,
          lastResult,
          playWin,
          playLose,
          playCardValueChange,
          onRevealSettled,
        });
      });
    }, handRevealDoneMs);
  }

  /** Queues a reveal timer and unregisters it once it has fired. */
  queueTimer(fn: () => void, delay: number): void {
    const timer = globalThis.setTimeout(() => {
      this.revealTimers.delete(timer);
      fn();
    }, delay);
    this.revealTimers.add(timer);
  }

  /**
   * Runs the post-result value-change animation for honor tiles after the
   * revealed hand and score change have already been shown.
   */
  private startWinRevealAnimation(options: {
    animationsEnabled: boolean;
    preWinHand: HandModel;
    postWinHand: HandModel;
    lastResult: RevealResult;
    playWin: () => void;
    playLose: () => void;
    playCardValueChange: () => void;
    onRevealSettled: () => void;
  }): void {
    const {
      animationsEnabled,
      preWinHand,
      postWinHand,
      lastResult,
      playWin,
      playLose,
      playCardValueChange,
      onRevealSettled,
    } = options;

    if (!animationsEnabled) {
      const hasValueChange = postWinHand.tiles.some((tile, index) => {
        const previousTile = preWinHand.tiles[index];
        return previousTile && previousTile.currentValue !== tile.currentValue;
      });

      this.sequenceLocked.set(true);
      this.winBannerActive.set(true);
      if (lastResult === 'win') {
        playWin();
      } else if (lastResult === 'lose') {
        playLose();
      }
      this.queueTimer(() => {
        this.historyReady.set(true);
        this.tileValueOverrides.set(
          Object.fromEntries(postWinHand.tiles.map((tile) => [tile.id, tile.currentValue])),
        );
        this.hiddenTotalOverride.set(postWinHand.total);
        if (hasValueChange) {
          playCardValueChange();
        }
      }, WIN_NO_ANIMATION_RESULT_PAUSE_MS);
      this.queueTimer(() => {
        this.winBannerActive.set(false);
        onRevealSettled();
        this.sequenceLocked.set(false);
        this.preWinHiddenHand.set(null);
        this.postWinHiddenHand.set(null);
        this.tileValueOverrides.set(null);
        this.hiddenTotalOverride.set(null);
      }, WIN_NO_ANIMATION_RESULT_PAUSE_MS + WIN_BANNER_SHOW_MS);
      return;
    }

    const startValues = Object.fromEntries(
      preWinHand.tiles.map((tile) => [tile.id, tile.currentValue]),
    );
    const finalValues = Object.fromEntries(
      postWinHand.tiles.map((tile) => [tile.id, tile.currentValue]),
    );
    const valueSteps: { id: string; value: number; total: number }[] = [];
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

    this.sequenceLocked.set(true);
    this.winBannerActive.set(true);
    this.historyReady.set(true);
    this.tileValueOverrides.set(startValues);
    this.hiddenTotalOverride.set(preWinHand.total);

    this.queueTimer(() => {
      if (lastResult === 'win') {
        playWin();
      } else if (lastResult === 'lose') {
        playLose();
      }
    }, 0);

    this.queueTimer(() => {
      this.valueAnimationActive.set(true);
    }, WIN_PRE_VALUE_DELAY_MS);

    valueSteps.forEach((step, index) => {
      this.queueTimer(
        () => {
          const currentValues = this.tileValueOverrides() ?? {};
          this.tileValueOverrides.set({
            ...currentValues,
            [step.id]: step.value,
          });
          this.hiddenTotalOverride.set(step.total);
        },
        WIN_PRE_VALUE_DELAY_MS + index * WIN_VALUE_STEP_MS,
      );
    });

    const finishDelay =
      WIN_PRE_VALUE_DELAY_MS +
      Math.max(0, valueSteps.length - 1) * WIN_VALUE_STEP_MS +
      WIN_POST_VALUE_SETTLE_MS;
    this.queueTimer(() => {
      this.tileValueOverrides.set(finalValues);
      this.hiddenTotalOverride.set(postWinHand.total);
      this.winBannerActive.set(false);
      this.valueAnimationActive.set(false);
      onRevealSettled();
      this.sequenceLocked.set(false);
      this.preWinHiddenHand.set(null);
      this.postWinHiddenHand.set(null);
      this.queueTimer(() => {
        this.tileValueOverrides.set(null);
        this.hiddenTotalOverride.set(null);
      }, 40);
    }, finishDelay);
  }
}
