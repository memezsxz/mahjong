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

  clearTimers(): void {
    for (const timer of this.animationTimers) {
      globalThis.clearTimeout(timer);
    }
    this.animationTimers.clear();
  }

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
    const centerY = centerRect.top + centerRect.height / 2 - mainRect.top;
    const bottomX = bottomRect.left + bottomRect.width / 2 - mainRect.left;
    const bottomY = bottomRect.top + bottomRect.height / 2 - mainRect.top;

    this.transitionPromotedStartX.set(centerX);
    this.transitionPromotedStartY.set(centerY);
    this.transitionPromotedDeltaX.set(bottomX - centerX);
    this.transitionPromotedDeltaY.set(bottomY - centerY);
  }

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

  setIncomingHiddenHand(hand: HandModel | null): void {
    this.transitionIncomingHiddenHand.set(hand);
  }

  setIncomingPhaseIdle(): void {
    this.incomingHiddenEnterActive.set(false);
    this.incomingVisibleTotalActive.set(false);
  }

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

  queueTimer(fn: () => void, delay: number): void {
    const timer = globalThis.setTimeout(() => {
      this.animationTimers.delete(timer);
      fn();
    }, delay);
    this.animationTimers.add(timer);
  }
}
