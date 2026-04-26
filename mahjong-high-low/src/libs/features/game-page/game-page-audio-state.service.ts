import { effect, inject, Injectable } from '@angular/core';
import { GameAudioManager } from '@hbg/game-data-access';
import { GamePhase } from '@hbg/shared-models';

type TrackedValueKey =
  | 'scoreDisplay'
  | 'reshuffleDraw'
  | 'reshuffleDiscard';

type AudioStateBindings = {
  scoreDisplayValue: () => number | null;
  reshuffleDrawValue: () => number | null;
  reshuffleDiscardValue: () => number | null;
  gamePhase: () => GamePhase;
  isPaused: () => boolean;
  musicEnabled: () => boolean;
};

@Injectable()
export class GamePageAudioStateService {
  private readonly audioManager = inject(GameAudioManager);
  private previousValues: Record<TrackedValueKey, number | null> = {
    scoreDisplay: null,
    reshuffleDraw: null,
    reshuffleDiscard: null,
  };
  private effectsRegistered = false;

  registerEffects(bindings: AudioStateBindings): void {
    if (this.effectsRegistered) {
      return;
    }

    this.effectsRegistered = true;

    effect(() => {
      this.playStepSoundForValueChange(
        bindings.scoreDisplayValue(),
        'scoreDisplay',
      );
    });

    effect(() => {
      this.playStepSoundForValueChange(
        bindings.reshuffleDrawValue(),
        'reshuffleDraw',
      );
    });

    effect(() => {
      this.playStepSoundForValueChange(
        bindings.reshuffleDiscardValue(),
        'reshuffleDiscard',
      );
    });

    effect(() => {
      const phase = bindings.gamePhase();
      const paused = bindings.isPaused();
      const musicEnabled = bindings.musicEnabled();

      if (!musicEnabled || phase === GamePhase.Idle || phase === GamePhase.GameOver) {
        this.audioManager.syncMusic('none');
        return;
      }

      this.audioManager.syncMusic(paused ? 'pause' : 'gameplay');
    });
  }

  stopMusic(): void {
    this.audioManager.syncMusic('none');
  }

  private playStepSoundForValueChange(
    nextValue: number | null,
    key: TrackedValueKey,
  ): void {
    const previousValue = this.previousValues[key];

    if (nextValue === null) {
      this.previousValues[key] = null;
      return;
    }

    if (previousValue === null) {
      this.previousValues[key] = nextValue;
      return;
    }

    if (nextValue > previousValue) {
      this.audioManager.playScoreIncrease();
    } else if (nextValue < previousValue) {
      this.audioManager.playScoreDecrease();
    }

    this.previousValues[key] = nextValue;
  }
}
