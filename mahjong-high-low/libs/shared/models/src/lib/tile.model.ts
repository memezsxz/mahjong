export enum NumberSuit {
    Characters = 'characters',
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
    type: 'number';
    suit: NumberSuit;
}

interface WindTile {
    type: 'wind';
    suit: WindSuit;
}

interface DragonTile {
    type: 'dragon';
    suit: DragonSuit;
}

type TileInfo = NumberTile | WindTile | DragonTile;

export type TileDefinition = TileInfo & {
    faceValue: number;
};

export type TileInstance = TileDefinition & {
    id: string;
    currentValue: number;
};
