export enum TileType {
    Number = 'number',
    Wind = 'wind',
    Dragon = 'dragon',
}
export enum NumberSuit {
    Pinyin = 'pinyin',
    Dots = 'dots',
    Bamboo = 'bamboo'
}

export enum DragonSuit {
    Red = 'red',
    Green = 'green',
    White = 'white'
}

export enum WindSuit {
    East = 'east',
    South = 'south',
    West = 'west',
    North = 'north'
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

export type TileInfo = NumberTile | WindTile | DragonTile;

export type TileDefinition = TileInfo & {
    faceValue: number;
};

export type TileInstance = TileDefinition & {
    id: string;
    currentValue: number;
};
