import { TileInstance, TileType } from '@hbg/shared-models';

/** Base directory for Mahjong tile image assets. */
const TILE_ASSET_DIRECTORY = 'assets/tiles/';
/** File extension used by tile image assets. */
const TILE_ASSET_EXTENSION = '.png';

/** Resolves the asset path for a tile instance based on tile type, suit, and face value. */
export function getTileAssetPath(tile: TileInstance): string {
  const valueSuffix = tile.type === TileType.Number ? `-${tile.faceValue}` : '';
  return `${TILE_ASSET_DIRECTORY}${tile.type}-${tile.suit}${valueSuffix}${TILE_ASSET_EXTENSION}`;
}
