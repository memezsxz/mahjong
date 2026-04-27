import { Component, input } from '@angular/core';
import { HandHistoryItem } from '@hbg/shared-models';
import { getTileAssetPath } from '../tile-asset-path';

/**
 * Displays the recent hand-history entries shown in the game sidebar.
 */
@Component({
  selector: 'lib-hand-history',
  templateUrl: './hand-history.html',
  styleUrls: ['../game-ui.animation-tokens.css', './hand-history.css'],
})
export class HandHistory {
  history = input.required<HandHistoryItem[]>();

  tileAssetPath = getTileAssetPath;

  tileBackgroundImage(tileIdPath: string): string {
    return `url("${tileIdPath}")`;
  }
}
