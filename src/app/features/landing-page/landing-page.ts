import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SettingsPanel } from '@hbg/game-ui';
import { PlayerSettingsModel } from '@hbg/shared-models';
import { GameAudioManager, ScoresService, SettingsService } from '@hbg/game-data-access';

@Component({
  selector: 'lib-landing-page',
  imports: [ButtonModule, DatePipe, DecimalPipe, SettingsPanel],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
  standalone: true,
})
export class LandingPage {
  private readonly router = inject(Router);
  readonly settingsService = inject(SettingsService);
  readonly scoresService = inject(ScoresService);
  readonly audioManager = inject(GameAudioManager);

  settingsOpen = signal(false);

  startGame() {
    this.audioManager.registerInteraction();
    this.router.navigate(['/game']);
  }

  onSettingsChanged(partial: Partial<PlayerSettingsModel>) {
    this.settingsService.update(partial);
  }
}
