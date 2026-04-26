import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Bet, GamePhase, GameStateModel, HandHistoryItem, HandModel } from '@hbg/shared-models';
import {
  buildDeck,
  calculateScore,
  checkGameOverShuffle,
  DEFAULT_HAND_SIZE,
  drawHand,
  evaluateBet,
  reshuffleDeck,
  scaleHandValues,
  checkGameOverHand,
} from '@hbg/shared-util-game';
import { SettingsService } from '../settings.service';

export const GameStore = signalStore(
  { providedIn: 'root' },
  withState<GameStateModel>({
    drawPile: [],
    discard: [],
    hiddenHand: null,
    visibleHand: null,
    winStreak: 0,
    currentScore: 0,
    reshuffleCount: 0,
    handSize: DEFAULT_HAND_SIZE,
    gamePhase: GamePhase.Idle,
    isPaused: false,
    gameOverReason: null,
    lastResult: null,
    lastScoreChange: null,
    handHistory: [],
  }),

  withComputed((state) => ({
    isDrawPileEmpty: computed(() => state.drawPile().length === 0), // TODO: we should handle the draw pile not having enough to draw the hand
    isGameActive: computed(() => state.gamePhase() !== GamePhase.Idle && state.gamePhase() !== GamePhase.GameOver),
    isGameOver: computed(() => state.gamePhase() === GamePhase.GameOver),
    totalTileCount: computed(() => state.drawPile().length + state.discard().length),
  })),

  withMethods((store) => {
    const playerSettings = inject(SettingsService);

    return {
      startGame() {
        const selectedHandSize = playerSettings.settings().handSize;
        let nextDeck = buildDeck();
        const { hand: firstHand, drawPile: firstRemainingDeck } = drawHand(selectedHandSize, nextDeck);
        nextDeck = firstRemainingDeck;
        const { hand: secondHand, drawPile: secondRemainingDeck } = drawHand(selectedHandSize, nextDeck);

        patchState(store, {
          drawPile: secondRemainingDeck,
          discard: [],
          hiddenHand: secondHand,
          visibleHand: firstHand,
          winStreak: 0,
          currentScore: 0,
          reshuffleCount: 0,
          handSize: selectedHandSize,
          gamePhase: GamePhase.Betting,
          isPaused: false,
          gameOverReason: null,
          lastResult: null,
          lastScoreChange: null,
          handHistory: [],
        });
      },

      togglePause() {
        patchState(store, {
          isPaused: !store.isPaused(),
        });
      },

      placeBet(playerBet: Bet) {
        const visibleHand = store.visibleHand();
        const hiddenHand = store.hiddenHand();
        if (!visibleHand || !hiddenHand) {
          return;
        }

        const result = evaluateBet(visibleHand, hiddenHand, playerBet);
        const { newWinStreak, calculatedScore } = calculateScore(
          hiddenHand,
          store.currentScore(),
          store.winStreak(),
          result,
        );
        const scoreChange = calculatedScore - store.currentScore();
        const gameOverReason = checkGameOverHand(hiddenHand.tiles);
        const historyEntry: HandHistoryItem = {
          round: store.handHistory().length + 1,
          bet: playerBet,
          result,
          scoreChange,
          visibleHand: cloneHand(visibleHand),
          hiddenHand: cloneHand(hiddenHand),
        };

        patchState(store, {
          hiddenHand: scaleHandValues(hiddenHand, result),
          winStreak: newWinStreak,
          currentScore: calculatedScore,
          gamePhase: gameOverReason ? GamePhase.GameOver : GamePhase.Revealing,
          handHistory: [...store.handHistory(), historyEntry],
          lastResult: result,
          lastScoreChange: scoreChange,
          gameOverReason,
        });
      },

      nextHand() {
        const currentHiddenHand = store.hiddenHand();
        if (!currentHiddenHand) {
          return;
        }

        let nextDeck = store.drawPile();
        let nextDiscard = [...store.discard(), ...currentHiddenHand.tiles];
        let nextReshuffleCount = store.reshuffleCount();

        if (store.drawPile().length < store.handSize()) {
          const reshuffleGameOver = checkGameOverShuffle(nextReshuffleCount + 1);
          if (reshuffleGameOver) {
            patchState(store, {
              visibleHand: currentHiddenHand,
              discard: nextDiscard,
              gamePhase: GamePhase.GameOver,
              lastResult: null,
              lastScoreChange: null,
              gameOverReason: reshuffleGameOver,
            });
            return;
          }

          nextDeck = reshuffleDeck(nextDeck, nextDiscard);
          nextDiscard = [];
          nextReshuffleCount += 1;
        }

        const gameOverReason = checkGameOverShuffle(nextReshuffleCount);
        const { hand: nextHiddenHand, drawPile: nextDrawPile } = drawHand(
          store.handSize(),
          nextDeck,
        );

        patchState(store, {
          drawPile: nextDrawPile,
          discard: nextDiscard,
          hiddenHand: nextHiddenHand,
          visibleHand: currentHiddenHand,
          reshuffleCount: nextReshuffleCount,
          gamePhase: gameOverReason ? GamePhase.GameOver : GamePhase.Betting,
          lastResult: null,
          lastScoreChange: null,
          gameOverReason,
        });
      },

      checkForPendingReshuffleGameOver() {
        const currentHiddenHand = store.hiddenHand();
        if (!currentHiddenHand) {
          return false;
        }

        if (store.drawPile().length >= store.handSize()) {
          return false;
        }

        const reshuffleGameOver = checkGameOverShuffle(store.reshuffleCount() + 1);
        if (!reshuffleGameOver) {
          return false;
        }

        patchState(
          store,
          {
            visibleHand: currentHiddenHand,
            discard: [...store.discard(), ...currentHiddenHand.tiles],
            gamePhase: GamePhase.GameOver,
            lastResult: null,
            lastScoreChange: null,
            gameOverReason: reshuffleGameOver,
          },
        );

        return true;
      },

      exitGame() {
        patchState(store, {
          drawPile: [],
          discard: [],
          hiddenHand: null,
          visibleHand: null,
          winStreak: 0,
          currentScore: 0,
          reshuffleCount: 0,
          handSize: playerSettings.settings().handSize,
          gamePhase: GamePhase.Idle,
          isPaused: false,
          gameOverReason: null,
          lastResult: null,
          lastScoreChange: null,
          handHistory: [],
        });
      },
    };
  }),
);

function cloneHand(hand: HandModel): HandModel {
  return {
    total: hand.total,
    tiles: hand.tiles.map((tile) => ({ ...tile })),
  };
}
