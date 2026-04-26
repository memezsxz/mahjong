import {TileInstance} from "@hbg/shared-models";
import {MAX_RESHUFFLES, MAX_TILE_VALUE, MIN_TILE_VALUE} from "./game.config.js";

export function checkGameOverHand(handTiles: TileInstance[]): 'tile-min' | 'tile-max' | null {
    if (handTiles.some(tile => tile.currentValue <= MIN_TILE_VALUE)) return 'tile-min';
    if (handTiles.some(tile => tile.currentValue >= MAX_TILE_VALUE)) return 'tile-max';
    return null
}

export function checkGameOverShuffle(reshuffleCount: number): 'reshuffle' | null {
    if (reshuffleCount > MAX_RESHUFFLES) return 'reshuffle';
    return null
}
