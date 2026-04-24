import {TileInstance, TileType} from "@hbg/shared-models";
import {TILES_EXT, TILES_LOCATION} from "./game.config.js";

export function getTileAssetPath(tile: TileInstance) {
    const suffix = (tile.type == TileType.Number ?  `-${tile.faceValue}` : "" ) + TILES_EXT
    return TILES_LOCATION + `${tile.type}-${tile.suit}` + suffix
}