import { Component, computed, input } from '@angular/core';
import {TileInstance} from '@hbg/shared-models'
import {getTileAssetPath} from '@hbg/shared-util-game'

@Component({
  selector: 'lib-tile',
  imports: [],
  templateUrl: './tile.html',
  styleUrl: './tile.css',
})
export class Tile {
  tile = input.required<TileInstance>();
  showValue = input<boolean>(true);
  faceDown = input<boolean>(false);
  private assetPath = computed(() => getTileAssetPath(this.tile()));

  displayPath = computed(() =>
    this.faceDown() ? 'assets/tiles/tile.png' : this.assetPath()
  );

}
