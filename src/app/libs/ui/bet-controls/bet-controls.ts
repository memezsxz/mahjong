import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * Renders the Higher/Lower action buttons used during betting.
 */
@Component({
  selector: 'lib-bet-controls',
  imports: [ButtonModule],
  templateUrl: './bet-controls.html',
  styleUrls: ['../game-ui.animation-tokens.css', './bet-controls.css'],
  standalone: true,
})
export class BetControls {
  handTotal = input.required<number>();
  showTotal = input<boolean>(true);
  disabled = input<boolean>(false);
  betPlaced = output<'higher' | 'lower'>();
}
