import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PlayerSettingsModel } from '@hbg/shared-models';

@Component({
  selector: 'lib-settings-panel',
  imports: [ButtonModule],
  templateUrl: './settings-panel.html',
  styleUrl: './settings-panel.css',
})
export class SettingsPanel {
  settings = input.required<PlayerSettingsModel>();
  inGame   = input<boolean>(false);
  settingsChanged = output<Partial<PlayerSettingsModel>>();
  closed = output<void>();

  readonly handSizeOptions: Array<3 | 4 | 5> = [3, 4, 5];
}
