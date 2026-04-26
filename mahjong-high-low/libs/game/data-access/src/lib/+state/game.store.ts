import {patchState, signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {Bet, GamePhase, GameStateModel, HandHistoryItem} from "@hbg/shared-models";
import {computed, inject} from "@angular/core";
import {
    buildDeck,
    calculateScore,
    checkGameOverHand,
    checkGameOverShuffle,
    DEFAULT_HAND_SIZE,
    drawHand,
    evaluateBet,
    reshuffleDeck,
    scaleHandValues
} from "@hbg/shared-util-game";
import {SettingsService} from "../settings.service";

export const GameStore = signalStore(
    {providedIn: 'root'},
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
        isGameActive: computed(() => state.gamePhase() != GamePhase.Idle && state.gamePhase() != GamePhase.GameOver),
        isGameOver: computed(() => state.gamePhase() === GamePhase.GameOver),
        totalTileCount: computed(() => state.drawPile().length + state.discard().length)
    })),

    withMethods((store) => {
        const playerSettings = inject(SettingsService);
        return {
            startGame() {
            let newDeck = buildDeck()
            const {hand: firstHand, drawPile: firstRemainingDeck} = drawHand(store.handSize(), newDeck)
            newDeck = firstRemainingDeck
            const {hand: secondHand, drawPile: secondRemainingDeck} = drawHand(store.handSize(), newDeck)
            newDeck = secondRemainingDeck
            patchState(store, {
                drawPile: newDeck,
                gamePhase: GamePhase.Betting,
                hiddenHand: secondHand,
                visibleHand: firstHand,
                discard: [],
                winStreak: 0,
                currentScore: 0,
                reshuffleCount: 0,
                isPaused: false,
                lastResult: null,
                lastScoreChange: null,
                gameOverReason: null,
                handSize: playerSettings.settings().handSize,
                handHistory: [],
            });
        },
        togglePause() {
            patchState(store, {
                isPaused: !store.isPaused(),
            })
        },
        placeBet(playerBet: Bet) {
            const visibleHand = store.visibleHand()!
            const hiddenHand = store.hiddenHand()!
            const result = evaluateBet(visibleHand, hiddenHand, playerBet)
            const {
                newWinStreak,
                calculatedScore
            } = calculateScore(hiddenHand, store.currentScore(), store.winStreak(), result)
            const newHiddenHand = scaleHandValues(hiddenHand, result)
            const isGameOver = checkGameOverHand(newHiddenHand.tiles)
            const scoreChange = calculatedScore - store.currentScore()

            const historyEntry: HandHistoryItem = {
                round:       store.handHistory().length + 1,
                bet:         playerBet,
                result,
                scoreChange,
                visibleHand: {
                    total: visibleHand.total,
                    tiles: visibleHand.tiles.map((tile) => ({ ...tile })),
                },
                hiddenHand: {
                    total: hiddenHand.total,
                    tiles: hiddenHand.tiles.map((tile) => ({ ...tile })),
                },
            }

            patchState(store, {
                hiddenHand: newHiddenHand,
                winStreak: newWinStreak,
                currentScore: calculatedScore,
                lastScoreChange: scoreChange,
                gamePhase: isGameOver ? GamePhase.GameOver : GamePhase.Revealing,
                gameOverReason: isGameOver,
                lastResult: result,
                handHistory: [...store.handHistory(), historyEntry],
            })
        },
        nextHand() {
            let deck = store.drawPile()
            let discard = [...store.discard(), ...store.hiddenHand()!.tiles]
            let reshuffleCount = store.reshuffleCount()
            const currentHiddenHand = store.hiddenHand()

            if (store.drawPile().length < store.handSize()) {
                const reshuffleGameOver = checkGameOverShuffle(reshuffleCount + 1)
                if (reshuffleGameOver) {
                    patchState(store, {
                        visibleHand: currentHiddenHand,
                        discard: discard,
                        gamePhase: GamePhase.GameOver,
                        gameOverReason: reshuffleGameOver,
                        lastResult: null,
                        lastScoreChange: null,
                    })
                    return
                }

                deck = reshuffleDeck(deck, discard)
                discard = []
                reshuffleCount += 1
            }

            const isGameOver = checkGameOverShuffle(reshuffleCount)

            const {hand, drawPile} = drawHand(store.handSize(), deck)
            patchState(store, {
                drawPile: drawPile,
                discard: discard,
                hiddenHand: hand,
                visibleHand: currentHiddenHand,
                reshuffleCount: reshuffleCount,
                gamePhase: isGameOver ? GamePhase.GameOver : GamePhase.Betting,
                gameOverReason: isGameOver,
                lastResult: null,
                lastScoreChange: null,
            })
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
                lastResult: null,
                lastScoreChange: null,
                gameOverReason: null,
                handHistory: [],
            })
        }
        }
    })
)
