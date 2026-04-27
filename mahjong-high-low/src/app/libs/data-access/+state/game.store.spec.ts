import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import {
  Bet,
  DragonSuit,
  GamePhase,
  HandModel,
  PlayerSettingsModel,
  TileInstance,
  TileType,
  NumberSuit,
} from '@hbg/shared-models';
import {
  DEFAULT_HAND_SIZE,
  HONOR_TILE_BASE_VALUE,
  MAX_RESHUFFLES,
  MAX_TILE_VALUE,
  MIN_TILE_VALUE,
} from '@hbg/shared-util-game';
import { SettingsService } from '../settings.service';
import { GameStore } from './game.store';

describe('GameStore end conditions', () => {
  let store: InstanceType<typeof GameStore>;

  const settingsState = signal<PlayerSettingsModel>({
    handSize: DEFAULT_HAND_SIZE,
    soundEnabled: true,
    musicEnabled: true,
    animationsEnabled: true,
    showTileValues: true,
    hasSeenTutorial: false,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SettingsService,
          useValue: {
            settings: settingsState.asReadonly(),
          },
        },
      ],
    });

    store = TestBed.inject(GameStore);
    store.exitGame();
  });

  it('allows a reshuffle when the attempted reshuffle reaches the configured limit', () => {
    const handSize = 3;
    const promotedHiddenHand = createHand([
      createHonorTile('reshuffle-hidden-a', HONOR_TILE_BASE_VALUE),
      createNumberTile('reshuffle-hidden-b', 2),
      createNumberTile('reshuffle-hidden-c', 3),
    ]);

    patchState(unprotected(store), {
      drawPile: [createNumberTile('reshuffle-draw-only', 1)],
      discard: [
        createNumberTile('discard-a', 4),
        createNumberTile('discard-b', 5),
        createNumberTile('discard-c', 6),
      ],
      hiddenHand: promotedHiddenHand,
      visibleHand: createHand([
        createNumberTile('visible-a', 1),
        createNumberTile('visible-b', 1),
        createNumberTile('visible-c', 1),
      ]),
      reshuffleCount: MAX_RESHUFFLES - 1,
      handSize,
      gamePhase: GamePhase.Betting,
      gameOverReason: null,
      lastResult: null,
      lastScoreChange: null,
    });

    store.nextHand();

    expect(store.gamePhase()).toBe(GamePhase.Betting);
    expect(store.gameOverReason()).toBeNull();
    expect(store.reshuffleCount()).toBe(MAX_RESHUFFLES);
    expect(store.visibleHand()).toEqual(promotedHiddenHand);
    expect(store.hiddenHand()).not.toBeNull();
    expect(store.discard()).toEqual([]);
  });

  it('ends the run when the next reshuffle would exceed the configured limit', () => {
    const handSize = 3;
    const promotedHiddenHand = createHand([
      createHonorTile('gameover-hidden-a', HONOR_TILE_BASE_VALUE),
      createNumberTile('gameover-hidden-b', 2),
      createNumberTile('gameover-hidden-c', 3),
    ]);

    patchState(unprotected(store), {
      drawPile: [createNumberTile('gameover-draw-only', 1)],
      discard: [createNumberTile('discard-existing', 6)],
      hiddenHand: promotedHiddenHand,
      visibleHand: createHand([
        createNumberTile('visible-1', 1),
        createNumberTile('visible-2', 1),
        createNumberTile('visible-3', 1),
      ]),
      reshuffleCount: MAX_RESHUFFLES,
      handSize,
      gamePhase: GamePhase.Betting,
      gameOverReason: null,
      lastResult: null,
      lastScoreChange: null,
    });

    store.nextHand();

    expect(store.gamePhase()).toBe(GamePhase.GameOver);
    expect(store.gameOverReason()).toBe('reshuffle');
    expect(store.visibleHand()).toEqual(promotedHiddenHand);
    expect(store.reshuffleCount()).toBe(MAX_RESHUFFLES);
    expect(store.discard()).toEqual([
      createNumberTile('discard-existing', 6),
      ...promotedHiddenHand.tiles,
    ]);
  });

  it('ends the run on a win when a scaled honor tile reaches the configured max tile value', () => {
    const hiddenHonorTile = createHonorTile('win-honor', MAX_TILE_VALUE - 1);

    patchState(unprotected(store), {
      visibleHand: createHand([
        createNumberTile('visible-low-a', 1),
        createNumberTile('visible-low-b', 1),
        createNumberTile('visible-low-c', 1),
      ]),
      hiddenHand: createHand([
        hiddenHonorTile,
        createNumberTile('hidden-win-b', 4),
        createNumberTile('hidden-win-c', 3),
      ]),
      currentScore: 0,
      winStreak: 0,
      handHistory: [],
      gamePhase: GamePhase.Betting,
      gameOverReason: null,
    });

    store.placeBet(Bet.High);

    expect(store.lastResult()).toBe('win');
    expect(store.gamePhase()).toBe(GamePhase.GameOver);
    expect(store.gameOverReason()).toBe('tile-max');
    expect(findTile(store.hiddenHand()!, hiddenHonorTile.id)?.currentValue).toBe(MAX_TILE_VALUE);
  });

  it('ends the run on a loss when a scaled honor tile reaches the configured min tile value', () => {
    const hiddenHonorTile = createHonorTile('lose-honor', MIN_TILE_VALUE + 1);

    patchState(unprotected(store), {
      visibleHand: createHand([
        createNumberTile('visible-high-a', 9),
        createNumberTile('visible-high-b', 8),
        createNumberTile('visible-high-c', 7),
      ]),
      hiddenHand: createHand([
        hiddenHonorTile,
        createNumberTile('hidden-lose-b', 1),
        createNumberTile('hidden-lose-c', 2),
      ]),
      currentScore: 30,
      winStreak: 2,
      handHistory: [],
      gamePhase: GamePhase.Betting,
      gameOverReason: null,
    });

    store.placeBet(Bet.High);

    expect(store.lastResult()).toBe('lose');
    expect(store.gamePhase()).toBe(GamePhase.GameOver);
    expect(store.gameOverReason()).toBe('tile-min');
    expect(findTile(store.hiddenHand()!, hiddenHonorTile.id)?.currentValue).toBe(MIN_TILE_VALUE);
  });
});

function createHand(tiles: TileInstance[]): HandModel {
  return {
    tiles,
    total: tiles.reduce((sum, tile) => sum + tile.currentValue, 0),
  };
}

function createHonorTile(id: string, currentValue: number): TileInstance {
  return {
    id,
    type: TileType.Dragon,
    suit: DragonSuit.Red,
    faceValue: HONOR_TILE_BASE_VALUE,
    currentValue,
  };
}

function createNumberTile(id: string, currentValue: number): TileInstance {
  return {
    id,
    type: TileType.Number,
    suit: NumberSuit.Bamboo,
    faceValue: currentValue,
    currentValue,
  };
}

function findTile(hand: HandModel, tileId: string): TileInstance | undefined {
  return hand.tiles.find((tile) => tile.id === tileId);
}
