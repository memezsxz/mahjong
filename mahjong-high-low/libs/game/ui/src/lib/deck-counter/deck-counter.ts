import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'lib-deck-counter',
  imports: [],
  templateUrl: './deck-counter.html',
  styleUrl: './deck-counter.css',
})
export class DeckCounter {
  drawCount = input.required<number>();
  discardCount = input.required<number>();
  reshuffleCount = input.required<number>();
  maxReshuffles = input<number>(3);

  pips = computed(() =>
    Array.from({ length: this.maxReshuffles() }, (_, i) => i < this.reshuffleCount())
  );
}