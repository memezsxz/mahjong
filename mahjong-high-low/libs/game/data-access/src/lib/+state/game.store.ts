import {patchState, signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import {Bet, GamePhase, GameStateModel} from "@hbg/shared-models";
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
        lastResult: null
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
                gameOverReason: null,
                handSize: playerSettings.settings().handSize,
            });
        },
        togglePause() {
            patchState(store, {
                isPaused: !store.isPaused(),
            })
        },
        placeBet(playerBet: Bet) {
            const result = evaluateBet(store.visibleHand()!, store.hiddenHand()!, playerBet)
            const {
                newWinStreak,
                calculatedScore
            } = calculateScore(store.hiddenHand()!, store.currentScore(), store.winStreak(), result)
            const newHiddenHand = scaleHandValues(store.hiddenHand()!, result)
            const isGameOver = checkGameOverHand(newHiddenHand.tiles)


            patchState(store, {
                hiddenHand: newHiddenHand,
                winStreak: newWinStreak,
                currentScore: calculatedScore,
                gamePhase: isGameOver ? GamePhase.GameOver : GamePhase.Revealing,
                gameOverReason: isGameOver,
                lastResult: result
            })
        },
        nextHand() {
            let deck = store.drawPile()
            let discard = [...store.discard(), ...store.hiddenHand()!.tiles]
            let reshuffleCount = store.reshuffleCount()

            if (store.drawPile().length < store.handSize()) {
                deck = reshuffleDeck(store.discard())
                discard = []
                reshuffleCount += 1
            }

            const isGameOver = checkGameOverShuffle(reshuffleCount)

            const {hand, drawPile} = drawHand(store.handSize(), deck)

            const currentHiddenHand = store.hiddenHand()
            patchState(store, {
                drawPile: drawPile,
                discard: discard,
                hiddenHand: hand,
                visibleHand: currentHiddenHand,
                reshuffleCount: reshuffleCount,
                gamePhase: isGameOver ? GamePhase.GameOver : GamePhase.Betting,
                gameOverReason: isGameOver,
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
                gameOverReason: null,
            })
        }
        }
    })
)
