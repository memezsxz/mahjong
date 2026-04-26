import { TileInstance, TileType } from '@hbg/shared-models';

const TILE_ASSET_DIRECTORY = 'assets/tiles/';
const TILE_ASSET_EXTENSION = '.png';

export function getTileAssetPath(tile: TileInstance): string {
  const valueSuffix =
    tile.type === TileType.Number ? `-${tile.faceValue}` : '';
  return `${TILE_ASSET_DIRECTORY}${tile.type}-${tile.suit}${valueSuffix}${TILE_ASSET_EXTENSION}`;
}
