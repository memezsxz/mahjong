import { Component } from '@angular/core';
import { DragonSuit, HandModel, NumberSuit, TileType, WindSuit } from '@hbg/shared-models';
import { Hand } from '@hbg/game-ui';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

interface HandHistoryRow {
  round: number;
  bet: string;
  result: string;
  scoreChange: number;
}

@Component({
  selector: 'app-playground',
  imports: [Hand, ButtonModule, TagModule],
  templateUrl: './playground.html',
  styleUrl: './playground.css',
})
export class Playground {
  // ── Hands ─────────────────────────────────────────────────────────────
  visibleHand: HandModel = {
    tiles: [
      {
        type: TileType.Number,
        suit: NumberSuit.Bamboo,
        faceValue: 3,
        id: 'bamboo-3-0',
        currentValue: 3,
      },
      {
        type: TileType.Number,
        suit: NumberSuit.Dots,
        faceValue: 5,
        id: 'dots-5-0',
        currentValue: 5,
      },
      {
        type: TileType.Wind,
        suit: WindSuit.South,
        faceValue: 0,
        id: 'wind-south-1',
        currentValue: 5,
      },
    ],
    total: 13,
  };

  hiddenHand: HandModel = {
    tiles: [
      {
        type: TileType.Dragon,
        suit: DragonSuit.Red,
        faceValue: 0,
        id: 'dragon-red-1',
        currentValue: 7,
      },
      {
        type: TileType.Number,
        suit: NumberSuit.Pinyin,
        faceValue: 6,
        id: 'pinyin-6-0',
        currentValue: 6,
      },
      {
        type: TileType.Number,
        suit: NumberSuit.Bamboo,
        faceValue: 2,
        id: 'bamboo-2-0',
        currentValue: 2,
      },
    ],
    total: 15,
  };

  // ── Hand History (sidebar) ─────────────────────────────────────────────
  handHistory: HandHistoryRow[] = [
    { round: 1, bet: 'HIGHER', result: 'WIN', scoreChange: 26 },
    { round: 2, bet: 'LOWER', result: 'WIN', scoreChange: 18 },
    { round: 3, bet: 'HIGHER', result: 'LOSE', scoreChange: -11 },
    { round: 4, bet: 'HIGHER', result: 'WIN', scoreChange: 14 },
    { round: 5, bet: 'LOWER', result: 'WIN', scoreChange: 32 },
  ];
}