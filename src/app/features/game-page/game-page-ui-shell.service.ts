import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { GameStore, ScoresService } from '@hbg/game-data-access';
import { GamePhase } from '@hbg/shared-models';

@Injectable()
export class GamePageUiShellService {
  /** Maximum number of characters allowed when naming a leaderboard run. */
  private static readonly MAX_RUN_NAME_LENGTH = 10;
  readonly maxRunNameLength = GamePageUiShellService.MAX_RUN_NAME_LENGTH;
  readonly settingsOpen = signal(false);
  readonly exitDialogOpen = signal(false);
  readonly exitSavePanelOpen = signal(false);
  readonly gameOverNameDraft = signal('');
  readonly scoreQualifiesForLeaderboard = computed(() =>
    this.scoresService.qualifiesForLeaderboard(this.store.currentScore()),
  );
  readonly scoreSaved = computed(() =>
    this.exitSavePanelOpen() ? this.exitScoreSaved() : this.gameOverScoreSaved(),
  );
  readonly needsGameOverName = computed(() => !this.getTrimmedGameOverName());

  private readonly store = inject(GameStore);
  private readonly scoresService = inject(ScoresService);
  private pendingLeaveResolver: ((allowed: boolean) => void) | null = null;
  private readonly gameOverScoreSaved = signal(false);
  private readonly exitScoreSaved = signal(false);

  constructor() {
    effect(() => {
      if (this.store.gamePhase() !== GamePhase.GameOver) {
        return;
      }

      this.gameOverScoreSaved.set(false);
      this.gameOverNameDraft.set('');
    });
  }

  requestLeave(
    hasActiveProgress: boolean,
  ): boolean | Promise<boolean> {
    if (!hasActiveProgress) {
      return true;
    }

    this.exitDialogOpen.set(true);

    return new Promise<boolean>((resolve) => {
      this.pendingLeaveResolver = resolve;
    });
  }

  openExitFlow(
    hasActiveProgress: boolean,
  ): 'exit-now' | 'dialog-opened' {
    if (!hasActiveProgress) {
      return 'exit-now';
    }

    this.exitDialogOpen.set(true);
    return 'dialog-opened';
  }

  resolvePendingLeave(allowed: boolean): boolean {
    this.exitDialogOpen.set(false);
    this.exitSavePanelOpen.set(false);
    if (!this.pendingLeaveResolver) {
      return false;
    }

    this.pendingLeaveResolver(allowed);
    this.pendingLeaveResolver = null;
    return true;
  }

  resetScoreSaved(): void {
    this.gameOverScoreSaved.set(false);
    this.exitScoreSaved.set(false);
    this.gameOverNameDraft.set('');
    this.exitSavePanelOpen.set(false);
    this.exitDialogOpen.set(false);
  }

  openExitSavePanel(): void {
    this.exitDialogOpen.set(false);
    this.exitScoreSaved.set(false);
    this.gameOverNameDraft.set('');
    this.exitSavePanelOpen.set(true);
  }

  cancelExitSavePanel(): void {
    this.exitScoreSaved.set(false);
    this.gameOverNameDraft.set('');
    this.exitSavePanelOpen.set(false);
  }

  onGameOverNameInput(value: string): void {
    this.gameOverNameDraft.set(value.slice(0, GamePageUiShellService.MAX_RUN_NAME_LENGTH));
  }

  saveScoreWithName(): void {
    const playerName = this.getTrimmedGameOverName();
    if (!playerName || this.scoreSaved() || !this.scoreQualifiesForLeaderboard()) {
      return;
    }

    this.saveScore(playerName);
  }

  dismissExitDialog(): void {
    this.resolvePendingLeave(false);
  }

  dismissExitSavePanel(): void {
    this.cancelExitSavePanel();
    this.resolvePendingLeave(false);
  }

  saveScoreWithNameAndCheckExit(): boolean {
    this.saveScoreWithName();
    return this.exitSavePanelOpen() && this.scoreSaved();
  }

  private saveScore(playerName: string | null): void {
    if (!playerName || this.scoreSaved() || !this.scoreQualifiesForLeaderboard()) {
      return;
    }

    const scoreSaved = this.scoresService.submitScore(
      playerName,
      this.store.currentScore(),
    );
    if (!scoreSaved) {
      return;
    }

    if (this.exitSavePanelOpen()) {
      this.exitScoreSaved.set(true);
      return;
    }

    this.gameOverScoreSaved.set(true);
  }

  private getTrimmedGameOverName(): string | null {
    const playerName = this.gameOverNameDraft()
      .slice(0, GamePageUiShellService.MAX_RUN_NAME_LENGTH)
      .trim();
    return playerName ? playerName : null;
  }
}
