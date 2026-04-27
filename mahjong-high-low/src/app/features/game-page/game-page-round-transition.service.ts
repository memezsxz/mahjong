import { Injectable, signal } from '@angular/core';
import { HandModel } from '@hbg/shared-models';
import {
  NEXT_ROUND_INCOMING_HIDDEN_DELAY_MS,
  NEXT_ROUND_PROMOTE_DELAY_MS,
  NEXT_ROUND_PROMOTE_MS,
  NEXT_ROUND_TRANSITION_TOTAL_MS,
  NEXT_ROUND_VISIBLE_TOTAL_ENTER_DELAY_MS,
  REVEAL_PROMOTION_FINISH_BUFFER_MS,
} from './game-page.animations';

/**
 * Holds the transient state for the game page's between-round motion system.
 *
 * The store changes hands immediately; this service preserves the outgoing and
 * incoming snapshots long enough for the UI to animate them across the board.
 */
@Injectable()
export class GamePageRoundTransitionService {
  readonly roundTransitionActive = signal(false);
  readonly visibleHandExitActive = signal(false);
  readonly promotedHandMoveActive = signal(false);
  readonly incomingHiddenEnterActive = signal(false);
  readonly incomingVisibleTotalActive = signal(false);
  readonly transitionOutgoingVisibleHand = signal<HandModel | null>(null);
  readonly transitionPromotedVisibleHand = signal<HandModel | null>(null);
  readonly transitionIncomingHiddenHand = signal<HandModel | null>(null);
  readonly transitionOutgoingVisibleTotal = signal<number | null>(null);
  readonly transitionIncomingVisibleTotal = signal<number | null>(null);
  readonly transitionPromotedStartX = signal(0);
  readonly transitionPromotedStartY = signal(0);
  readonly transitionPromotedDeltaX = signal(0);
  readonly transitionPromotedDeltaY = signal(0);

  private readonly animationTimers = new Set<ReturnType<typeof globalThis.setTimeout>>();

  /** Clears all queued transition timers. */
  clearTimers(): void {
    for (const timer of this.animationTimers) {
      globalThis.clearTimeout(timer);
    }
    this.animationTimers.clear();
  }

  /** Resets every transition signal after the current motion sequence ends. */
  reset(): void {
    this.clearTimers();
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
  }

  /**
   * Measures the center and bottom hand slots so the promoted hand can travel
   * along the real rendered path instead of using hardcoded coordinates.
   */
  measureRoundTransition(
    main: globalThis.HTMLElement | undefined,
    center: globalThis.HTMLElement | undefined,
    bottom: globalThis.HTMLElement | undefined,
  ): void {
    if (!main || !center || !bottom) return;

    const mainRect = main.getBoundingClientRect();
    const centerRect = center.getBoundingClientRect();
    const bottomRect = bottom.getBoundingClientRect();
    const centerX = centerRect.left + centerRect.width / 2 - mainRect.left;
     let centerY = centerRect.top + centerRect.height / 2 - mainRect.top;
    const bottomX = bottomRect.left + bottomRect.width / 2 - mainRect.left;
    const bottomY = bottomRect.top + bottomRect.height / 2 - mainRect.top;

    // When the center element contains a lib-hand with reserveTotalSlot, the
    // bounding rect includes the invisible total-slot span below the tiles row.
    // The transition hands have no total slot, so element center = tiles center.
    // Subtract half of (slot height + gap) to align with the tiles-only center.
    const totalDisplay = center.querySelector<HTMLElement>('.hand-total-display');
    if (totalDisplay) {
      const totalH = totalDisplay.getBoundingClientRect().height;
      centerY -= (8 + totalH) / 2;
    }

    this.transitionPromotedStartX.set(centerX);
    this.transitionPromotedStartY.set(centerY);
    this.transitionPromotedDeltaX.set(bottomX - centerX);
    this.transitionPromotedDeltaY.set(bottomY - centerY);
  }

  /** Captures the hand snapshots used by the outgoing and promoted overlays. */
  prepareTransition(
    outgoingVisibleHand: HandModel,
    promotedVisibleHand: HandModel,
  ): void {
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
  }

  /** Stores the next hidden hand until its delayed incoming animation begins. */
  setIncomingHiddenHand(hand: HandModel | null): void {
    this.transitionIncomingHiddenHand.set(hand);
  }

  /** Clears pending incoming-entry flags when a deferred reshuffle is waiting. */
  setIncomingPhaseIdle(): void {
    this.incomingHiddenEnterActive.set(false);
    this.incomingVisibleTotalActive.set(false);
  }

  /**
   * Runs the standard next-round transition:
   * outgoing visible hand exits, revealed hand promotes, then the next hidden
   * hand enters unless that incoming step is being deferred behind reshuffle UI.
   */
  startRoundTransition(options: {
    deferIncomingHidden?: boolean;
    onVisibleExit?: () => void;
    onPromote?: () => void;
    onIncoming?: () => void;
    onIncomingVisibleTotal?: () => void;
    onFinish?: () => void;
  }): void {
    const {
      deferIncomingHidden = false,
      onVisibleExit,
      onPromote,
      onIncoming,
      onIncomingVisibleTotal,
      onFinish,
    } = options;

    globalThis.requestAnimationFrame(() =>
      globalThis.requestAnimationFrame(() => {
        this.visibleHandExitActive.set(true);
        onVisibleExit?.();

        this.queueTimer(() => {
          this.promotedHandMoveActive.set(true);
          onPromote?.();
        }, NEXT_ROUND_PROMOTE_DELAY_MS);

        if (!deferIncomingHidden) {
          this.queueTimer(() => {
            this.incomingHiddenEnterActive.set(true);
            onIncoming?.();
          }, NEXT_ROUND_INCOMING_HIDDEN_DELAY_MS);

          this.queueTimer(() => {
            this.incomingVisibleTotalActive.set(true);
            onIncomingVisibleTotal?.();
          }, NEXT_ROUND_VISIBLE_TOTAL_ENTER_DELAY_MS);

          this.queueTimer(() => {
            onFinish?.();
          }, NEXT_ROUND_TRANSITION_TOTAL_MS);
        }
      }),
    );
  }

  /**
   * Runs the shorter promotion used after a reveal settles and the now-revealed
   * hidden hand replaces the visible hand without dealing a new hidden hand yet.
   */
  startPromotionOnlyTransition(options: {
    onVisibleExit?: () => void;
    onPromote?: () => void;
    onIncomingVisibleTotal?: () => void;
    onFinish?: () => void;
  }): void {
    const {
      onVisibleExit,
      onPromote,
      onIncomingVisibleTotal,
      onFinish,
    } = options;

    globalThis.requestAnimationFrame(() =>
      globalThis.requestAnimationFrame(() => {
        this.visibleHandExitActive.set(true);
        onVisibleExit?.();

        this.queueTimer(() => {
          this.promotedHandMoveActive.set(true);
          this.incomingVisibleTotalActive.set(true);
          onIncomingVisibleTotal?.();
          onPromote?.();
        }, NEXT_ROUND_PROMOTE_DELAY_MS);

        this.queueTimer(() => {
          onFinish?.();
        }, NEXT_ROUND_PROMOTE_DELAY_MS + NEXT_ROUND_PROMOTE_MS + REVEAL_PROMOTION_FINISH_BUFFER_MS);
      }),
    );
  }

  /** Prepares an incoming-only sequence used after reveal promotion. */
  prepareIncomingOnlyTransition(hand: HandModel): void {
    this.transitionOutgoingVisibleHand.set(null);
    this.transitionPromotedVisibleHand.set(null);
    this.transitionOutgoingVisibleTotal.set(null);
    this.transitionIncomingVisibleTotal.set(null);
    this.transitionIncomingHiddenHand.set(hand);
    this.roundTransitionActive.set(true);
    this.visibleHandExitActive.set(false);
    this.promotedHandMoveActive.set(false);
    this.incomingHiddenEnterActive.set(false);
    this.incomingVisibleTotalActive.set(false);
  }

  /** Starts the incoming-only hand entrance once the next hand already exists. */
  startIncomingOnlyTransition(options: {
    finishDelay: number;
    onIncoming?: () => void;
    onFinish?: () => void;
  }): void {
    const { finishDelay, onIncoming, onFinish } = options;

    globalThis.requestAnimationFrame(() =>
      globalThis.requestAnimationFrame(() => {
        this.incomingHiddenEnterActive.set(true);
        onIncoming?.();
        this.queueTimer(() => {
          onFinish?.();
        }, finishDelay);
      }),
    );
  }

  /**
   * Resumes the hidden-hand entrance after the reshuffle counter animation has
   * completed and the store has produced the new hidden hand.
   */
  activateDeferredIncoming(options: {
    finishDelay: number;
    onIncoming?: () => void;
    onIncomingVisibleTotal?: () => void;
    onFinish?: () => void;
  }): void {
    const { finishDelay, onIncoming, onIncomingVisibleTotal, onFinish } = options;

    globalThis.requestAnimationFrame(() =>
      globalThis.requestAnimationFrame(() => {
        this.incomingHiddenEnterActive.set(true);
        onIncoming?.();
        this.queueTimer(() => {
          this.incomingVisibleTotalActive.set(true);
          onIncomingVisibleTotal?.();
        }, 0);
        this.queueTimer(() => {
          onFinish?.();
        }, finishDelay);
      }),
    );
  }

  /** Queues a transition timer and removes it after execution. */
  queueTimer(fn: () => void, delay: number): void {
    const timer = globalThis.setTimeout(() => {
      this.animationTimers.delete(timer);
      fn();
    }, delay);
    this.animationTimers.add(timer);
  }
}
