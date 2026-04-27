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

/**
 * Signal-store state for the active Mahjong High-Low run.
 *
 * Responsibilities:
 * - bootstrapping a new game,
 * - resolving bets and score/streak changes,
 * - advancing hands and reshuffles,
 * - exposing derived flags for gameplay and UI.
 */
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
      /**
       * Starts a fresh game using the current player-selected hand size.
       */
      startGame() {
        const selectedHandSize = playerSettings.settings().handSize;
        let nextDeck = buildDeck();
        // The first drawn hand is the player's visible hand.
        const { hand: firstHand, drawPile: firstRemainingDeck } = drawHand(selectedHandSize, nextDeck);
        nextDeck = firstRemainingDeck;
        // The second drawn hand becomes the opening hidden hand.
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

      /**
       * Toggles the paused state of the current run.
       */
      togglePause() {
        patchState(store, {
          isPaused: !store.isPaused(),
        });
      },

      /**
       * Resolves a Higher/Lower bet against the hidden hand and updates score,
       * streak, history, and terminal state.
       */
      placeBet(playerBet: Bet) {
        const visibleHand = store.visibleHand();
        const hiddenHand = store.hiddenHand();
        if (!visibleHand || !hiddenHand) {
          return;
        }

        // Resolve the bet before any tile scaling is applied to the hidden hand.
        const result = evaluateBet(visibleHand, hiddenHand, playerBet);
        const { newWinStreak, calculatedScore } = calculateScore(
          hiddenHand,
          store.currentScore(),
          store.winStreak(),
          result,
        );
        const scoreChange = calculatedScore - store.currentScore();
        const scaledHiddenHand = scaleHandValues(hiddenHand, result);
        // A hand can end the run after scaling pushes an honor tile to the configured bounds.
        const gameOverReason = checkGameOverHand(scaledHiddenHand.tiles);
        const historyEntry: HandHistoryItem = {
          round: store.handHistory().length + 1,
          bet: playerBet,
          result,
          scoreChange,
          visibleHand: cloneHand(visibleHand),
          hiddenHand: cloneHand(hiddenHand),
        };

        patchState(store, {
          hiddenHand: scaledHiddenHand,
          winStreak: newWinStreak,
          currentScore: calculatedScore,
          gamePhase: gameOverReason ? GamePhase.GameOver : GamePhase.Revealing,
          handHistory: [...store.handHistory(), historyEntry],
          lastResult: result,
          lastScoreChange: scoreChange,
          gameOverReason,
        });
      },

      /**
       * Advances to the next hand, performing a reshuffle when required.
       */
      nextHand() {
        const currentHiddenHand = store.hiddenHand();
        if (!currentHiddenHand) {
          return;
        }

        // The current hidden hand is promoted into the next visible hand, so its
        // tiles move into discard tracking before the next hidden hand is drawn.
        let nextDeck = store.drawPile();
        let nextDiscard = [...store.discard(), ...currentHiddenHand.tiles];
        let nextReshuffleCount = store.reshuffleCount();

        // If there are not enough tiles left to draw the next hand, determine
        // whether the attempted reshuffle would end the run before rebuilding.
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

          // Rebuild from a fresh deck plus remaining draw/discard tiles, then
          // reset discard because those tiles have been folded into the new deck.
          nextDeck = reshuffleDeck(nextDeck, nextDiscard);
          nextDiscard = [];
          nextReshuffleCount += 1;
        }

        // Draw the next hidden hand from the prepared deck state and return the
        // game to betting unless the reshuffle limit has already been crossed.
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

      /**
       * Evaluates whether the next required reshuffle would immediately end the run.
       */
      checkForPendingReshuffleGameOver() {
        const currentHiddenHand = store.hiddenHand();
        if (!currentHiddenHand) {
          return false;
        }

        if (store.drawPile().length >= store.handSize()) {
          return false;
        }

        // This is called after promotion/reveal flows to catch a reshuffle loss
        // before the user is allowed to continue into another betting round.
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

      /**
       * Resets the game store back to the idle state.
       */
      exitGame() {
        // Preserve the player's selected hand size, but clear all run state.
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

/**
 * Creates a detached snapshot copy of a hand for history persistence.
 */
function cloneHand(hand: HandModel): HandModel {
  return {
    total: hand.total,
    tiles: hand.tiles.map((tile) => ({ ...tile })),
  };
}
