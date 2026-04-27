import { Injectable, signal } from '@angular/core';
import {
  RESHUFFLE_EXIT_MS,
  RESHUFFLE_MID_GAP_MS,
  RESHUFFLE_SETTLE_MS,
  RESHUFFLE_STEP_MS,
} from './game-page.animations';

/**
 * Owns the temporary UI state used while the discard pile is animated back into
 * the draw pile.
 *
 * The store performs the actual reshuffle; this service only controls the
 * sidebar counters and transition flags that make the reshuffle readable.
 */
@Injectable()
export class GamePageReshuffleSequenceService {
  readonly reshuffleSequenceActive = signal(false);
  readonly reshuffleSequenceExitActive = signal(false);
  readonly reshuffleDisplayDrawCount = signal<number | null>(null);
  readonly reshuffleDisplayDiscardCount = signal<number | null>(null);
  readonly reshuffleTransitionPendingIncoming = signal(false);
  readonly reshufflePattern = signal(0);

  private readonly timers = new Set<ReturnType<typeof globalThis.setTimeout>>();

  /** Clears every queued reshuffle animation timer. */
  clearTimers(): void {
    for (const timer of this.timers) {
      globalThis.clearTimeout(timer);
    }
    this.timers.clear();
  }

  /** Resets reshuffle flags so the next round starts from a clean UI state. */
  resetSequenceState(): void {
    this.clearTimers();
    this.reshuffleSequenceActive.set(false);
    this.reshuffleSequenceExitActive.set(false);
  }

  /**
   * Releases the temporary displayed counts once store values have caught up to
   * the reshuffle presentation.
   */
  clearDisplayCountsIfSynced(drawCount: number, discardCount: number): void {
    const displayDraw = this.reshuffleDisplayDrawCount();
    const displayDiscard = this.reshuffleDisplayDiscardCount();

    if (displayDraw !== null && displayDraw !== drawCount) {
      return;
    }

    if (displayDiscard !== null && displayDiscard !== discardCount) {
      return;
    }

    this.reshuffleDisplayDrawCount.set(null);
    this.reshuffleDisplayDiscardCount.set(null);
  }

  /**
   * Animates discard depletion first, then draw-pile refill, before handing
   * control back to the page for the delayed incoming-hand transition.
   */
  startReshuffleSequence(
    drawFrom: number,
    discardFrom: number,
    drawTo: number,
    discardTo: number,
    onDone: () => void,
  ): void {
    this.reshufflePattern.update((v) => (v + 1) % 3);
    this.reshuffleSequenceActive.set(true);
    this.reshuffleSequenceExitActive.set(false);
    this.reshuffleDisplayDrawCount.set(drawFrom);
    this.reshuffleDisplayDiscardCount.set(discardFrom);

    let cursorMs = 0;

    // Spread the total delta across a bounded number of visual steps so large
    // reshuffles remain readable without taking excessively long.
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
        cursorMs += RESHUFFLE_STEP_MS;
        const next = value;
        this.queueTimer(() => setValue(next), cursorMs);
      }
    };

    // The discard pile drains into the deck before the deck count climbs.
    scheduleSeries(discardFrom, discardTo, (v) => this.reshuffleDisplayDiscardCount.set(v), 14);
    cursorMs += RESHUFFLE_MID_GAP_MS;
    scheduleSeries(drawFrom, drawTo, (v) => this.reshuffleDisplayDrawCount.set(v), 18);

    const settleDelay = cursorMs + RESHUFFLE_SETTLE_MS;
    this.queueTimer(() => {
      this.reshuffleSequenceExitActive.set(true);
    }, settleDelay);

    this.queueTimer(() => {
      onDone();
      this.resetSequenceState();
    }, settleDelay + RESHUFFLE_EXIT_MS);
  }

  /** Queues a reshuffle animation timer and removes it once it fires. */
  private queueTimer(fn: () => void, delay: number): void {
    const timer = globalThis.setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, delay);
    this.timers.add(timer);
  }
}
