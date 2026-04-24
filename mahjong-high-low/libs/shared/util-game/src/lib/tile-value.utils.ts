import { HandResult, TileInstance, TileType} from "@hbg/shared-models";

export function scaleTileValue(tile: TileInstance, result: HandResult) {
    if (tile.type === TileType.Number || result === null) return {...tile} as TileInstance;

    return {...tile, currentValue: tile.currentValue + (result === 'win' ? 1 : -1)} as TileInstance;
}