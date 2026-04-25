import { Component, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'lib-pause-menu',
  imports: [ButtonModule],
  templateUrl: './pause-menu.html',
  styleUrl: './pause-menu.css',
})
export class PauseMenu {
  resumed = output<void>();
  settingsOpened = output<void>();
  exited = output<void>();
}