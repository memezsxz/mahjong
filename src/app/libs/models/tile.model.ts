export enum TileType {
  Number = 'number',
  Wind = 'wind',
  Dragon = 'dragon',
}
export enum NumberSuit {
  Pinyin = 'pinyin',
  Dots = 'dots',
  Bamboo = 'bamboo',
}

export enum DragonSuit {
  Red = 'red',
  Green = 'green',
  White = 'white',
}

export enum WindSuit {
  East = 'east',
  South = 'south',
  West = 'west',
  North = 'north',
}

interface NumberTile {
  type: TileType.Number;
  suit: NumberSuit;
}

interface WindTile {
  type: TileType.Wind;
  suit: WindSuit;
}

interface DragonTile {
  type: TileType.Dragon;
  suit: DragonSuit;
}

// `TileInfo` is the stable category/suit identity shared by every tile shape.
export type TileInfo = NumberTile | WindTile | DragonTile;

// `TileDefinition` is the static rules-layer definition before a runtime instance gets an ID.
export type TileDefinition = TileInfo & {
  faceValue: number;
};

// `TileInstance` is the runtime tile shape used in decks, hands, and persisted history snapshots.
export type TileInstance = TileDefinition & {
  id: string;
  currentValue: number;
};
