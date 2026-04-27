import {HandModel, HandResult, TileInstance, TileType} from "@hbg/shared-models";
import {calculateHandTotal} from "./hand-evaluator.utils.js";

/**
 * Applies the round result to a hand and returns a new hand with updated tile
 * values and recalculated total.
 *
 * Only honor tiles scale across rounds; number tiles keep their face/current
 * value.
 */
export function scaleHandValues(hand: HandModel, result: HandResult): HandModel {
    const newHand = hand.tiles.map((tile: TileInstance) => scaleTileValue(tile, result))

    return {
        tiles: newHand,
        total: calculateHandTotal(newHand)
    }
}

/**
 * Applies a single-round win/loss adjustment to a single tile.
 */
function scaleTileValue(tile: TileInstance, result: HandResult): TileInstance {
    if (tile.type === TileType.Number || result === null) return {...tile} as TileInstance;

    return {...tile, currentValue: tile.currentValue + (result === 'win' ? 1 : -1)} as TileInstance;
}
