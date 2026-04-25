import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SettingsPanel } from '@hbg/game-ui';
import { PlayerSettingsModel } from '@hbg/shared-models';

interface LeaderboardEntry {
  rank: number;
  player: string;
  score: number;
  date: string;
}

@Component({
  selector: 'lib-landing-page',
  imports: [ButtonModule, DecimalPipe, SettingsPanel],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css',
})
export class LandingPage {
  constructor(private router: Router) {}

  settingsOpen = signal(false);

  settings: PlayerSettingsModel = {
    handSize: 3,
    soundEnabled: true,
    musicEnabled: false,
    showTileValues: true,
    playerName: null,
    hasSeenTutorial: false,
  };

  // Will be replaced by LeaderboardService.topScores()
  topScores: LeaderboardEntry[] = [];

  startGame() {
    this.router.navigate(['/game']);
  }

  onSettingsChanged(partial: Partial<PlayerSettingsModel>) {
    this.settings = { ...this.settings, ...partial };
  }
}
