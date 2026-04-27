import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  signal,
} from '@angular/core';
import { TileInstance } from '@hbg/shared-models';
import {
  UI_TILE_REVEAL_FLIP_DURATION_MS,
  UI_TILE_VALUE_ROLL_DURATION_MS,
} from '../game-ui.animations';
import { getTileAssetPath } from '../tile-asset-path';

/**
 * Renders a single Mahjong tile and coordinates deal, flip, and value-roll UI state.
 */
@Component({
  selector: 'lib-tile',
  imports: [],
  templateUrl: './tile.html',
  styleUrls: ['../game-ui.animation-tokens.css', './tile.css'],
  host: {
    '[style.--tile-index]': 'tileIndex()',
    '[class.tile-flipping]': 'flipActive()',
  },
  standalone: true,
})
export class Tile implements OnDestroy {
  private el = inject(ElementRef<HTMLElement>);
  private valueRollTimer: ReturnType<typeof setTimeout> | null = null;
  private flipMidTimer: ReturnType<typeof setTimeout> | null = null;
  private flipEndTimer: ReturnType<typeof setTimeout> | null = null;
  private previousFaceDown: boolean | null = null;
  private readonly revealFlipDurationMs = UI_TILE_REVEAL_FLIP_DURATION_MS;

  tile = input.required<TileInstance>();
  showValue = input<boolean>(true);
  displayValue = input<number | null>(null);
  playValueChangeSound = input<boolean>(false);
  valueChangeSoundRequested = output<void>();
  faceDown = input<boolean>(false);
  tileIndex = input<number>(0);
  flipActive = signal(false);
  flipShowFront = signal(false);
  valueRolling = signal(false);
  valueRollDirection = signal<'up' | 'down'>('down');
  previousDisplayValue = signal<number | null>(null);
  currentDisplayValue = signal<number | null>(null);

  private assetPath = computed(() => getTileAssetPath(this.tile()));
  displayPath = computed(() => {
    if (this.flipActive()) {
      return this.flipShowFront() ? this.assetPath() : 'assets/tiles/tile.png';
    }
    return this.faceDown() ? 'assets/tiles/tile.png' : this.assetPath();
  });

  constructor() {
    effect(() => {
      const faceDown = this.faceDown();
      if (this.previousFaceDown === null) {
        this.previousFaceDown = faceDown;
        this.flipShowFront.set(!faceDown);
        return;
      }

      if (this.previousFaceDown && !faceDown) {
        this.startFlipAnimation();
      } else if (faceDown) {
        this.clearFlipTimers();
        this.flipActive.set(false);
        this.flipShowFront.set(false);
      } else {
        this.flipShowFront.set(true);
      }

      this.previousFaceDown = faceDown;
    });

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
      if (this.playValueChangeSound()) {
        this.valueChangeSoundRequested.emit();
      }
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
        }, UI_TILE_VALUE_ROLL_DURATION_MS);
      });
    });
  }

  /**
   * Forces the CSS deal animation to restart for this tile instance.
   */
  restartDealAnimation(): void {
    const el = this.el.nativeElement;
    el.classList.remove('dealing');
    void el.offsetWidth; // force reflow → restart animation
    el.classList.add('dealing');
  }

  /**
   * Runs the hidden-to-face-up flip animation used during reveal.
   */
  private startFlipAnimation(): void {
    this.clearFlipTimers();
    this.flipActive.set(false);
    this.flipShowFront.set(false);
    requestAnimationFrame(() => {
      this.flipActive.set(true);
      this.flipMidTimer = setTimeout(() => {
        this.flipShowFront.set(true);
        this.flipMidTimer = null;
      }, this.revealFlipDurationMs / 2);
      this.flipEndTimer = setTimeout(() => {
        this.flipActive.set(false);
        this.flipEndTimer = null;
      }, this.revealFlipDurationMs);
    });
  }

  /**
   * Clears any in-flight flip timers.
   */
  private clearFlipTimers(): void {
    if (this.flipMidTimer !== null) {
      clearTimeout(this.flipMidTimer);
      this.flipMidTimer = null;
    }
    if (this.flipEndTimer !== null) {
      clearTimeout(this.flipEndTimer);
      this.flipEndTimer = null;
    }
  }

  ngOnDestroy(): void {
    if (this.valueRollTimer !== null) {
      clearTimeout(this.valueRollTimer);
      this.valueRollTimer = null;
    }
    this.clearFlipTimers();
  }
}
