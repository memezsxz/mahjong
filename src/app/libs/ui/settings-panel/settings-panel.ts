import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PlayerSettingsModel } from '@hbg/shared-models';
import { VALID_HAND_SIZES } from '@hbg/shared-util-game';

/**
 * Sliding settings panel used from the landing page and game page.
 */
@Component({
  selector: 'lib-settings-panel',
  imports: [ButtonModule],
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.css',
  standalone: true,
})
export class SettingsPanel {
  settings = input.required<PlayerSettingsModel>();
  inGame = input<boolean>(false);
  settingsChanged = output<Partial<PlayerSettingsModel>>();
  closed = output<void>();

  /** Hand-size options exposed in the settings UI. */
  readonly handSizeOptions = [...VALID_HAND_SIZES];
}
