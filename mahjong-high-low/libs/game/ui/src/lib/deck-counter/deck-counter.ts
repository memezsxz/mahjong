import { Component, computed, effect, input, OnDestroy, signal } from '@angular/core';
import { UI_DECK_COUNTER_ROLL_DURATION_MS } from '../game-ui.animations';

@Component({
  selector: 'lib-deck-counter',
  imports: [],
  templateUrl: './deck-counter.html',
  styleUrls: ['../game-ui.animation-tokens.css', './deck-counter.css'],
})
export class DeckCounter implements OnDestroy {
  drawCount = input.required<number>();
  discardCount = input.required<number>();
  reshuffleCount = input.required<number>();
  displayDrawCount = input<number | null>(null);
  displayDiscardCount = input<number | null>(null);
  maxReshuffles = input<number>(3);
  drawRolling = signal(false);
  discardRolling = signal(false);
  drawRollDirection = signal<'up' | 'down'>('down');
  discardRollDirection = signal<'up' | 'down'>('down');
  previousDrawValue = signal<number | null>(null);
  currentDrawValue = signal<number | null>(null);
  previousDiscardValue = signal<number | null>(null);
  currentDiscardValue = signal<number | null>(null);
  private drawTimer: ReturnType<typeof setTimeout> | null = null;
  private discardTimer: ReturnType<typeof setTimeout> | null = null;

  pips = computed(() => {
    const total = Math.min(Math.max(this.maxReshuffles(), 0), 10);
    const usedCount = Math.min(this.reshuffleCount(), total);
    const columns = total <= 5 ? total : Math.ceil(total / 2);
    const rows = total <= 5 ? 1 : 2;
    const xStep = columns > 1 ? 100 / (columns - 1) : 0;
    const yPositions = rows === 1 ? [50] : [28, 72];

    return Array.from({ length: total }, (_, i) => {
      const row = rows === 1 ? 0 : Math.floor(i / columns);
      const column = rows === 1 ? i : i % columns;
      return {
        used: i < usedCount,
        left: columns === 1 ? 50 : column * xStep,
        top: yPositions[row],
      };
    });
  });

  constructor() {
    effect(() => {
      const nextValue = this.displayDrawCount() ?? this.drawCount();
      const current = this.currentDrawValue();
      if (current === null) {
        this.currentDrawValue.set(nextValue);
        return;
      }
      if (current === nextValue) return;
      this.previousDrawValue.set(current);
      this.currentDrawValue.set(nextValue);
      this.drawRollDirection.set(nextValue > current ? 'down' : 'up');
      this.drawRolling.set(false);
      if (this.drawTimer !== null) clearTimeout(this.drawTimer);
      requestAnimationFrame(() => {
        this.drawRolling.set(true);
        this.drawTimer = setTimeout(() => {
          this.drawRolling.set(false);
          this.previousDrawValue.set(null);
          this.drawTimer = null;
        }, UI_DECK_COUNTER_ROLL_DURATION_MS);
      });
    });

    effect(() => {
      const nextValue = this.displayDiscardCount() ?? this.discardCount();
      const current = this.currentDiscardValue();
      if (current === null) {
        this.currentDiscardValue.set(nextValue);
        return;
      }
      if (current === nextValue) return;
      this.previousDiscardValue.set(current);
      this.currentDiscardValue.set(nextValue);
      this.discardRollDirection.set(nextValue > current ? 'down' : 'up');
      this.discardRolling.set(false);
      if (this.discardTimer !== null) clearTimeout(this.discardTimer);
      requestAnimationFrame(() => {
        this.discardRolling.set(true);
        this.discardTimer = setTimeout(() => {
          this.discardRolling.set(false);
          this.previousDiscardValue.set(null);
          this.discardTimer = null;
        }, UI_DECK_COUNTER_ROLL_DURATION_MS);
      });
    });
  }

  ngOnDestroy(): void {
    if (this.drawTimer !== null) clearTimeout(this.drawTimer);
    if (this.discardTimer !== null) clearTimeout(this.discardTimer);
  }
}
