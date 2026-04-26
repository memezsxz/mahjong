import { Component, input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { HandHistoryItem } from '@hbg/shared-models';
import { getTileAssetPath } from '@hbg/shared-util-game';

@Component({
  selector: 'lib-hand-history',
  imports: [TagModule],
  templateUrl: './hand-history.html',
  styleUrl: './hand-history.css',
})
export class HandHistory {
  history = input.required<HandHistoryItem[]>();

  tileAssetPath = getTileAssetPath;
}
