import { Component, input } from '@angular/core';
import { HandModel } from '@hbg/shared-models';
import { Tile } from '../tile/tile';

@Component({
  selector: 'lib-hand',
  imports: [Tile],
  templateUrl: './hand.html',
  styleUrl: './hand.css',
})
export class Hand {
  hand = input.required<HandModel>();
  showTileValue = input.required<boolean>();
  showHandTiles = input.required<boolean>();
  showFullHandValue = input<boolean>(true);

}
