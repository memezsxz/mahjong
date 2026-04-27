import { Component, computed, effect, input, OnDestroy, signal } from '@angular/core';
import { UI_DECK_COUNTER_ROLL_DURATION_MS } from '../game-ui.animations';

/**
 * Displays draw/discard counts and reshuffle usage for the current run.
 *
 * The component supports both live counts and temporary display overrides used
 * during reshuffle presentation sequences.
 */
@Component({
  selector: 'lib-deck-counter',
  imports: [],
  templateUrl: './deck-counter.html',
  styleUrls: ['../game-ui.animation-tokens.css', './deck-counter.css'],
  standalone: true
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
    const total = this.maxReshuffles();
    const usedCount = Math.min(this.reshuffleCount(), total);
    const positions = this.getPipPositions(total);

    return positions.map((position, index) => ({
      used: index < usedCount,
      left: position.left,
      top: position.top,
    }));
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

  /**
   * Returns hand-tuned pip layouts for common reshuffle limits and falls back to
   * a generated grid for any other count.
   */
  private getPipPositions(total: number): { left: number; top: number }[] {
    const fixedLayouts: Partial<Record<number, { left: number; top: number }[]>> = {
      0: [],
      1: [{ left: 50, top: 50 }],
      2: [
        { left: 50, top: 30 },
        { left: 50, top: 70 },
      ],
      3: [
        { left: 50, top: 18 },
        { left: 22, top: 72 },
        { left: 78, top: 72 },
      ],
      4: [
        { left: 28, top: 28 },
        { left: 72, top: 28 },
        { left: 28, top: 72 },
        { left: 72, top: 72 },
      ],
      5: [
        { left: 50, top: 12 },
        { left: 18, top: 36 },
        { left: 30, top: 78 },
        { left: 70, top: 78 },
        { left: 82, top: 36 },
      ],
      6: [
        { left: 50, top: 10 },
        { left: 22, top: 28 },
        { left: 22, top: 72 },
        { left: 50, top: 90 },
        { left: 78, top: 72 },
        { left: 78, top: 28 },
      ],
      8: [
        { left: 22, top: 28 },
        { left: 38, top: 28 },
        { left: 22, top: 48 },
        { left: 38, top: 48 },
        { left: 62, top: 52 },
        { left: 78, top: 52 },
        { left: 62, top: 72 },
        { left: 78, top: 72 },
      ],
      9: [
        { left: 20, top: 24 },
        { left: 50, top: 16 },
        { left: 80, top: 8 },
        { left: 20, top: 50 },
        { left: 50, top: 42 },
        { left: 80, top: 34 },
        { left: 20, top: 76 },
        { left: 50, top: 68 },
        { left: 80, top: 60 },
      ],
      10: [
        { left: 50, top: 8 },
        { left: 20, top: 28 },
        { left: 50, top: 28 },
        { left: 80, top: 28 },
        { left: 20, top: 50 },
        { left: 50, top: 50 },
        { left: 80, top: 50 },
        { left: 20, top: 72 },
        { left: 50, top: 72 },
        { left: 80, top: 72 },
      ],
    };

    return fixedLayouts[total] ?? this.getFallbackGrid(total);
  }

  /**
   * Generates a simple grid layout when no fixed pip layout is defined.
   */
  private getFallbackGrid(total: number): { left: number; top: number }[] {
    if (total <= 0) {
      return [];
    }

    const columns = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / columns);
    const xStep = columns > 1 ? 100 / (columns - 1) : 0;
    const yStep = rows > 1 ? 100 / (rows - 1) : 0;

    return Array.from({ length: total }, (_, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;

      return {
        left: columns === 1 ? 50 : column * xStep,
        top: rows === 1 ? 50 : row * yStep,
      };
    });
  }
}
