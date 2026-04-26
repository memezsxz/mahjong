import {
  DragonSuit,
  HandModel,
  NumberSuit,
  TileInstance,
  TileType,
  WindSuit,
} from '@hbg/shared-models';
import { HONOR_TILE_BASE_VALUE } from './game.config.js';
import { calculateHandTotal } from './hand-evaluator.utils.js';

let reshuffleDeckSequence = 0;

export function buildDeck(): TileInstance[] {
  const cards: TileInstance[] = [
    ...buildNumberTiles(),
    ...buildHonorTiles(TileType.Dragon, HONOR_TILE_BASE_VALUE),
    ...buildHonorTiles(TileType.Wind, HONOR_TILE_BASE_VALUE),
  ];

  return cards;
}

function buildNumberTiles(): TileInstance[] {
  const sizeArray = Array.from({ length: 1 }, (_, i) => i + 1);
  const copyArray = Array.from({ length: 1 }, (_, i) => i + 1);

  const items: TileInstance[] = Object.values(NumberSuit).flatMap((suit) =>
    sizeArray.flatMap((value) =>
      copyArray.flatMap(
        (copy) =>
          ({
            id: `number-${suit}-${value}-${copy}`,
            type: 'number',
            suit: suit,
            faceValue: value,
            currentValue: value,
          }) as TileInstance,
      ),
    ),
  );

  return items;
}

function buildHonorTiles(
  tileType: TileType.Dragon | TileType.Wind,
  defaultValue: number,
): TileInstance[] {
  const copyArray = Array.from({ length: 4 }, (_, i) => i + 1);

  const suit = tileType == TileType.Dragon ? DragonSuit : WindSuit;

  const items: TileInstance[] = Object.values(suit).flatMap((suit) =>
    copyArray.flatMap(
      (copy) =>
        ({
          id: `${tileType}-${suit}-${copy}`,
          type: tileType,
          suit: suit,
          faceValue: defaultValue,
          currentValue: defaultValue,
        }) as TileInstance, // TODO: Fix
    ),
  );

  return items;
}

function shuffleDeck(deck: TileInstance[]): TileInstance[] {
  const newDeck: TileInstance[] = deck.slice();

  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }

  return newDeck;
}

export function drawHand(
  handSize: number,
  deck: TileInstance[],
): { hand: HandModel; drawPile: TileInstance[] } {
  const newDeck = shuffleDeck(deck);
  const hand = newDeck.slice(0, handSize);

  const drawPile = newDeck.slice(handSize);
  const handModel: HandModel = { tiles: hand, total: calculateHandTotal(hand) };

  return { hand: handModel, drawPile };
}

export function reshuffleDeck(oldDeck: TileInstance[] , discardPile: TileInstance[]) {
  reshuffleDeckSequence += 1;
  const freshDeck = buildDeck().map((tile) => ({
    ...tile,
    id: `${tile.id}-r${reshuffleDeckSequence}`,
  }));
  const newDeck = [...freshDeck, ...oldDeck, ...discardPile];

  return shuffleDeck(newDeck);
}
