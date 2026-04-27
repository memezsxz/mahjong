import { Injectable, signal } from '@angular/core';
import { SCORE_GAIN_FLY_MS, SCORE_GAIN_SETTLE_MS } from './game-page.animations';

/**
 * Manages the floating score-change indicator and temporary displayed score
 * override used during reveal resolution.
 */
@Injectable()
export class GamePageScoreAnimationService {
  readonly scoreDisplayOverride = signal<number | null>(null);
  readonly scoreGainAnimationActive = signal(false);
  readonly scoreGainTravelActive = signal(false);
  readonly scoreGainAmount = signal(0);
  readonly scoreGainDirection = signal<'up' | 'down'>('down');
  readonly scoreGainStartX = signal(0);
  readonly scoreGainStartY = signal(0);
  readonly scoreGainDeltaX = signal(0);
  readonly scoreGainDeltaY = signal(0);

  private readonly timers = new Set<ReturnType<typeof globalThis.setTimeout>>();

  /** Clears every queued score animation timer. */
  clearTimers(): void {
    for (const timer of this.timers) {
      globalThis.clearTimeout(timer);
    }
    this.timers.clear();
  }

  /** Resets score animation state so a new reveal starts from a clean baseline. */
  reset(): void {
    this.clearTimers();
    this.scoreDisplayOverride.set(null);
    this.scoreGainAnimationActive.set(false);
    this.scoreGainTravelActive.set(false);
    this.scoreGainAmount.set(0);
  }

  /**
   * Measures the travel path from the center reveal area to the sidebar score
   * slot so the floating value can animate into the real target.
   */
  measureScoreGainTransition(
    page: globalThis.HTMLElement | undefined,
    center: globalThis.HTMLElement | undefined,
    scoreSlot: globalThis.HTMLElement | undefined,
  ): void {
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

  /**
   * Starts the score gain or loss travel animation and swaps the displayed
   * sidebar score once the floating indicator reaches the target.
   */
  startScoreGainAnimation(options: {
    animationsEnabled: boolean;
    scoreBefore: number;
    scoreAfter: number;
    onDone: () => void;
    onIncrease: () => void;
    onDecrease: () => void;
  }): void {
    const {
      animationsEnabled,
      scoreBefore,
      scoreAfter,
      onDone,
      onIncrease,
      onDecrease,
    } = options;

    if (!animationsEnabled) {
      this.scoreDisplayOverride.set(null);
      onDone();
      return;
    }

    const delta = scoreAfter - scoreBefore;
    if (delta === 0) {
      this.scoreDisplayOverride.set(null);
      onDone();
      return;
    }

    this.scoreGainAmount.set(Math.abs(delta));
    this.scoreGainDirection.set(delta > 0 ? 'down' : 'up');
    this.scoreGainAnimationActive.set(true);
    this.scoreGainTravelActive.set(false);

    if (delta > 0) {
      onIncrease();
    } else {
      onDecrease();
    }

    globalThis.requestAnimationFrame(() =>
      globalThis.requestAnimationFrame(() => {
      this.scoreGainTravelActive.set(true);
    }),
    );

    this.queueTimer(() => {
      this.scoreDisplayOverride.set(scoreAfter);
    }, SCORE_GAIN_FLY_MS);

    this.queueTimer(() => {
      this.scoreGainAnimationActive.set(false);
      this.scoreGainTravelActive.set(false);
      this.scoreDisplayOverride.set(null);
      onDone();
    }, SCORE_GAIN_FLY_MS + SCORE_GAIN_SETTLE_MS);
  }

  /** Queues a score animation timer and unregisters it once it fires. */
  private queueTimer(fn: () => void, delay: number): void {
    const timer = globalThis.setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, delay);
    this.timers.add(timer);
  }
}
