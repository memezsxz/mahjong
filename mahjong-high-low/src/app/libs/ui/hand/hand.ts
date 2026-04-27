import { afterNextRender, Component, computed, effect, input, OnDestroy, output, signal, viewChildren } from '@angular/core';
import { HandModel } from '@hbg/shared-models';
import { Tile } from '../tile/tile';
import { UI_HAND_TOTAL_ROLL_DURATION_MS } from '../game-ui.animations';

/**
 * Renders a hand of tiles and coordinates deal, reveal, and total-roll UI state.
 */
@Component({
  selector: 'lib-hand',
  imports: [Tile],
  templateUrl: './hand.html',
  styleUrls: ['../game-ui.animation-tokens.css', './hand.css'],
})
export class Hand implements OnDestroy {
  hand              = input.required<HandModel>();
  showTileValue     = input.required<boolean>();
  showHandTiles     = input.required<boolean>();
  showFullHandValue = input<boolean>(true);
  reserveTotalSlot  = input<boolean>(false);
  tileValueOverrides = input<Record<string, number> | null>(null);
  handTotalOverride  = input<number | null>(null);
  playTileValueChangeSound = input<boolean>(false);
  faceUpTileIds = input<string[] | null>(null);
  valueVisibleTileIds = input<string[] | null>(null);
  dealTrigger       = input<number>(0);
  animateDeal       = input<boolean>(true);
  dealStarted       = output<void>();
  tileValueChangeSoundRequested = output<void>();

  private tileComponents = viewChildren(Tile);
  faceUpTileIdSet = computed(() => new Set(this.faceUpTileIds() ?? []));
  valueVisibleTileIdSet = computed(() => new Set(this.valueVisibleTileIds() ?? []));
  totalRolling = signal(false);
  totalRollDirection = signal<'up' | 'down'>('down');
  previousTotalValue = signal<number | null>(null);
  currentTotalValue = signal<number | null>(null);
  private totalRollTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    afterNextRender(() => {
      if (!this.animateDeal()) return;
      this.deal();
    });

    effect(() => {
      if (!this.animateDeal()) return;
      const trigger = this.dealTrigger();
      if (trigger < 1) return;
      requestAnimationFrame(() => requestAnimationFrame(() => this.deal()));
    });

    effect(() => {
      if (!this.showFullHandValue() && !this.reserveTotalSlot()) return;
      const nextTotal = this.handTotalOverride() ?? this.hand().total;
      const currentTotal = this.currentTotalValue();
      if (currentTotal === null) {
        this.currentTotalValue.set(nextTotal);
        return;
      }
      if (currentTotal === nextTotal) {
        return;
      }

      this.previousTotalValue.set(currentTotal);
      this.currentTotalValue.set(nextTotal);
      this.totalRollDirection.set(nextTotal > currentTotal ? 'down' : 'up');
      this.totalRolling.set(false);
      if (this.totalRollTimer !== null) {
        clearTimeout(this.totalRollTimer);
      }
      requestAnimationFrame(() => {
        this.totalRolling.set(true);
        this.totalRollTimer = setTimeout(() => {
          this.totalRolling.set(false);
          this.previousTotalValue.set(null);
          this.totalRollTimer = null;
        }, UI_HAND_TOTAL_ROLL_DURATION_MS);
      });
    });
  }

  /**
   * Re-triggers deal animations on the child tile components.
   */
  private deal(): void {
    this.dealStarted.emit();
    this.tileComponents().forEach(t => t.restartDealAnimation());
  }

  ngOnDestroy(): void {
    if (this.totalRollTimer !== null) {
      clearTimeout(this.totalRollTimer);
      this.totalRollTimer = null;
    }
  }
}
