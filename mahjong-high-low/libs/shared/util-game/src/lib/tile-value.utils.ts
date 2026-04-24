import {HandModel, HandResult, TileInstance, TileType} from "@hbg/shared-models";
import {calculateHandTotal} from "./hand-evaluator.utils.js";

export function scaleHandValues(hand: HandModel, result: HandResult): HandModel {
    const newHand = hand.tiles.map((tile: TileInstance) => scaleTileValue(tile, result))

    return {
        tiles: newHand,
        total: calculateHandTotal(newHand)
    }
}

function scaleTileValue(tile: TileInstance, result: HandResult): TileInstance {
    if (tile.type === TileType.Number || result === null) return {...tile} as TileInstance;

    return {...tile, currentValue: tile.currentValue + (result === 'win' ? 1 : -1)} as TileInstance;
}