import { computed, inject, Injectable, signal } from '@angular/core';
import { GameStore } from '@hbg/game-data-access';
import { GameOverReason, GamePhase, HandModel } from '@hbg/shared-models';
import { GamePageRevealSequenceService } from './game-page-reveal-sequence.service';
import { GamePageRoundTransitionService } from './game-page-round-transition.service';

@Injectable()
export class GamePageViewStateService {
  readonly revealedHandPromoted = signal(false);

  private readonly store = inject(GameStore);
  private readonly roundTransition = inject(GamePageRoundTransitionService);
  private readonly revealSequence = inject(GamePageRevealSequenceService);

  readonly showVisibleHandTransition = computed<boolean>(() =>
    this.roundTransition.roundTransitionActive() &&
    (!!this.roundTransition.transitionOutgoingVisibleHand() ||
      !!this.roundTransition.transitionPromotedVisibleHand()),
  );

  readonly displayedVisibleHand = computed<HandModel | null>(() => {
    if (
      this.store.gamePhase() === GamePhase.Revealing &&
      this.revealedHandPromoted()
    ) {
      return this.store.hiddenHand();
    }

    return this.store.visibleHand();
  });

  readonly displayedVisibleTotal = computed<number | null>(
    () => this.displayedVisibleHand()?.total ?? null,
  );

  readonly showCenterHiddenHand = computed<boolean>(() => {
    if (this.roundTransition.roundTransitionActive()) {
      return false;
    }

    return !(
      this.store.gamePhase() === GamePhase.Revealing &&
      this.revealedHandPromoted()
    );
  });

  readonly revealResultBannerText = computed<'WIN' | 'LOSE' | null>(() => {
    if (
      this.roundTransition.roundTransitionActive() ||
      this.store.gamePhase() !== GamePhase.Revealing ||
      !this.revealSequence.allTilesRevealed() ||
      !this.revealSequence.winBannerActive()
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

  readonly visibleWinStreak = computed<number>(() => {
    if (
      this.store.gamePhase() === GamePhase.Revealing &&
      !this.revealSequence.historyReady()
    ) {
      return Math.max(0, this.store.winStreak() - 1);
    }

    return this.store.winStreak();
  });

  readonly gameOverMessage = computed(() => {
    const messages: Record<NonNullable<GameOverReason>, string> = {
      'tile-min': 'A tile hit zero - the hand collapsed.',
      'tile-max': 'A tile maxed out - the hand is too powerful.',
      reshuffle: 'The deck ran out of reshuffles.',
    };
    const reason = this.store.gameOverReason();
    return reason ? messages[reason] : '';
  });

  readonly handHistory = computed(() => {
    const history = [...this.store.handHistory()];
    const shouldHoldLatestEntry =
      this.store.gamePhase() === GamePhase.Revealing &&
      !this.revealSequence.historyReady() &&
      history.length > 0;

    if (shouldHoldLatestEntry) {
      history.pop();
    }

    return history.reverse();
  });
}
