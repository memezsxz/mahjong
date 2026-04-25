import { Component, input } from '@angular/core';
import { TagModule } from 'primeng/tag';

export interface HandHistoryItem {
  round: number;
  bet: 'higher' | 'lower';
  result: 'win' | 'lose';
  scoreChange: number;
}

@Component({
  selector: 'lib-hand-history',
  imports: [TagModule],
  templateUrl: './hand-history.html',
  styleUrl: './hand-history.css',
})
export class HandHistory {
  history = input.required<HandHistoryItem[]>();
}