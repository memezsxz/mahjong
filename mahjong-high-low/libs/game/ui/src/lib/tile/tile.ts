import { Component, computed, ElementRef, inject, input } from '@angular/core';
import { TileInstance } from '@hbg/shared-models';
import { getTileAssetPath } from '@hbg/shared-util-game';

@Component({
  selector: 'lib-tile',
  imports: [],
  templateUrl: './tile.html',
  styleUrl: './tile.css',
  host: { '[style.--tile-index]': 'tileIndex()' },
})
export class Tile {
  private el = inject(ElementRef<HTMLElement>);

  tile      = input.required<TileInstance>();
  showValue = input<boolean>(true);
  faceDown  = input<boolean>(false);
  tileIndex = input<number>(0);

  private assetPath = computed(() => getTileAssetPath(this.tile()));
  displayPath = computed(() => this.faceDown() ? 'assets/tiles/tile.png' : this.assetPath());

  restartDealAnimation(): void {
    const el = this.el.nativeElement;
    el.classList.remove('dealing');
    void el.offsetWidth; // force reflow → restart animation
    el.classList.add('dealing');
  }
}
