import { Component, computed, effect, ElementRef, inject, input, OnDestroy, signal } from '@angular/core';
import { TileInstance } from '@hbg/shared-models';
import { getTileAssetPath } from '@hbg/shared-util-game';

@Component({
  selector: 'lib-tile',
  imports: [],
  templateUrl: './tile.html',
  styleUrl: './tile.css',
  host: { '[style.--tile-index]': 'tileIndex()' },
})
export class Tile implements OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private valueRollTimer: ReturnType<typeof setTimeout> | null = null;

  tile      = input.required<TileInstance>();
  showValue = input<boolean>(true);
  displayValue = input<number | null>(null);
  faceDown  = input<boolean>(false);
  tileIndex = input<number>(0);
  valueRolling = signal(false);
  valueRollDirection = signal<'up' | 'down'>('down');
  previousDisplayValue = signal<number | null>(null);
  currentDisplayValue = signal<number | null>(null);

  private assetPath = computed(() => getTileAssetPath(this.tile()));
  displayPath = computed(() => this.faceDown() ? 'assets/tiles/tile.png' : this.assetPath());

  constructor() {
    effect(() => {
      const shown = this.showValue();
      const value = this.displayValue() ?? this.tile().currentValue;
      if (!shown) return;

      const current = this.currentDisplayValue();
      if (current === null) {
        this.currentDisplayValue.set(value);
        return;
      }
      if (current === value) {
        return;
      }

      this.previousDisplayValue.set(current);
      this.currentDisplayValue.set(value);
      this.valueRollDirection.set(value > current ? 'down' : 'up');
      this.valueRolling.set(false);
      if (this.valueRollTimer !== null) {
        clearTimeout(this.valueRollTimer);
      }
      requestAnimationFrame(() => {
        this.valueRolling.set(true);
        this.valueRollTimer = setTimeout(() => {
          this.valueRolling.set(false);
          this.previousDisplayValue.set(null);
          this.valueRollTimer = null;
        }, 700);
      });
    });
  }

  restartDealAnimation(): void {
    const el = this.el.nativeElement;
    el.classList.remove('dealing');
    void el.offsetWidth; // force reflow → restart animation
    el.classList.add('dealing');
  }

  ngOnDestroy(): void {
    if (this.valueRollTimer !== null) {
      clearTimeout(this.valueRollTimer);
      this.valueRollTimer = null;
    }
  }
}
