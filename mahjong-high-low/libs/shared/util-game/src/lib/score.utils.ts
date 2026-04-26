import {HandModel, HandResult} from "@hbg/shared-models";
import {MAX_WIN_STREAK} from "./game.config.js";

// Wins grow score by hand total times the capped streak multiplier; losses reset streak and never drop below zero.
export function calculateScore(hand: HandModel, totalScore: number, winStreak: number, handResult: HandResult): {
    newWinStreak: number,
    calculatedScore: number
} {
    let calculatedScore = totalScore
    let newWinStreak = winStreak;

    if (handResult === null) return {newWinStreak, calculatedScore};

    if (handResult === 'win') {
        newWinStreak = Math.min(newWinStreak + 1, MAX_WIN_STREAK)
        calculatedScore += (hand.total * newWinStreak)
    } else {
        newWinStreak = 0
        calculatedScore = Math.max(0, calculatedScore - hand.total)
    }

    return {newWinStreak, calculatedScore}
}
