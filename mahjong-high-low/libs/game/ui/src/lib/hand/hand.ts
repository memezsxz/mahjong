import { afterNextRender, Component, effect, input, viewChildren } from '@angular/core';
import { HandModel } from '@hbg/shared-models';
import { Tile } from '../tile/tile';

@Component({
  selector: 'lib-hand',
  imports: [Tile],
  templateUrl: './hand.html',
  styleUrl: './hand.css',
})
export class Hand {
  hand              = input.required<HandModel>();
  showTileValue     = input.required<boolean>();
  showHandTiles     = input.required<boolean>();
  showFullHandValue = input<boolean>(true);
  dealTrigger       = input<number>(0);
  animateDeal       = input<boolean>(true);

  private tileComponents = viewChildren(Tile);

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
  }

  private deal(): void {
    this.tileComponents().forEach(t => t.restartDealAnimation());
  }
}
