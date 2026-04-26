import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { GameStore, ScoresService, SettingsService } from '@hbg/game-data-access';
import { GamePhase } from '@hbg/shared-models';

@Injectable()
export class GamePageUiShellService {
  readonly settingsOpen = signal(false);
  readonly exitDialogOpen = signal(false);
  readonly scoreSaved = signal(false);
  readonly gameOverNameDraft = signal('');
  readonly needsGameOverName = computed(() => !this.getTrimmedPlayerName());

  private readonly store = inject(GameStore);
  private readonly settingsService = inject(SettingsService);
  private readonly scoresService = inject(ScoresService);
  private pendingLeaveResolver: ((allowed: boolean) => void) | null = null;

  constructor() {
    effect(() => {
      if (this.store.gamePhase() !== GamePhase.GameOver) {
        return;
      }

      this.gameOverNameDraft.set(this.settingsService.settings().playerName ?? '');

      if (!this.scoreSaved() && !this.needsGameOverName()) {
        this.saveScore();
      }
    });
  }

  requestLeave(hasActiveProgress: boolean, onImmediateLeave: () => void): boolean | Promise<boolean> {
    if (!hasActiveProgress) {
      onImmediateLeave();
      return true;
    }

    this.exitDialogOpen.set(true);
    return new Promise<boolean>((resolve) => {
      this.pendingLeaveResolver = resolve;
    });
  }

  resolvePendingLeave(allowed: boolean): boolean {
    this.exitDialogOpen.set(false);
    if (!this.pendingLeaveResolver) {
      return false;
    }

    this.pendingLeaveResolver(allowed);
    this.pendingLeaveResolver = null;
    return true;
  }

  resetScoreSaved(): void {
    this.scoreSaved.set(false);
  }

  onGameOverNameInput(value: string): void {
    this.gameOverNameDraft.set(value);
  }

  saveScoreWithName(): void {
    const playerName = this.gameOverNameDraft().trim();
    if (!playerName || this.scoreSaved()) {
      return;
    }

    this.settingsService.update({ playerName });
    this.saveScore(playerName);
  }

  private saveScore(playerName: string | null = this.getTrimmedPlayerName()): void {
    if (!playerName || this.scoreSaved()) {
      return;
    }

    this.scoreSaved.set(true);
    this.scoresService.saveScore({
      playerName,
      totalScore: this.store.currentScore(),
      date: Date.now(),
    });
  }

  private getTrimmedPlayerName(): string | null {
    const playerName = this.settingsService.settings().playerName?.trim();
    return playerName ? playerName : null;
  }
}
