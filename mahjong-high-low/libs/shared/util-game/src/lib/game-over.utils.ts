import {TileInstance} from "@hbg/shared-models";
import {MAX_RESHUFFLES, MAX_TILE_VALUE, MIN_TILE_VALUE} from "./game.config.js";

export function checkGameOver(handTiles: TileInstance[], reshuffleCount: number): 'tile-min' | 'tile-max' | 'reshuffle' | null {
    if (handTiles.some(tile => tile.currentValue <= MIN_TILE_VALUE)) return 'tile-min';
    if (handTiles.some(tile => tile.currentValue >= MAX_TILE_VALUE)) return 'tile-max';
    if (reshuffleCount >= MAX_RESHUFFLES) return 'reshuffle';
    return null
}