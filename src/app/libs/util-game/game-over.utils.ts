import {TileInstance} from "@hbg/shared-models";
import {MAX_RESHUFFLES, MAX_TILE_VALUE, MIN_TILE_VALUE} from "./game.config.js";

/**
 * Evaluates whether a hand contains any tile that has crossed the configured
 * minimum or maximum tile-value bounds.
 */
export function checkGameOverHand(handTiles: TileInstance[]): 'tile-min' | 'tile-max' | null {
    if (handTiles.some(tile => tile.currentValue <= MIN_TILE_VALUE)) return 'tile-min';
    if (handTiles.some(tile => tile.currentValue >= MAX_TILE_VALUE)) return 'tile-max';
    return null
}

/**
 * Evaluates whether the attempted reshuffle count has exceeded the configured
 * reshuffle limit.
 */
export function checkGameOverShuffle(reshuffleCount: number): 'reshuffle' | null {
    if (reshuffleCount > MAX_RESHUFFLES) return 'reshuffle';
    return null
}
