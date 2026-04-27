import { effect, inject, Injectable } from '@angular/core';
import { GameAudioManager } from '@hbg/game-data-access';
import { GamePhase } from '@hbg/shared-models';

type TrackedValueKey =
  | 'scoreDisplay'
  | 'reshuffleDraw'
  | 'reshuffleDiscard';

interface AudioStateBindings {
  scoreDisplayValue: () => number | null;
  reshuffleDrawValue: () => number | null;
  reshuffleDiscardValue: () => number | null;
  gamePhase: () => GamePhase;
  isPaused: () => boolean;
  musicEnabled: () => boolean;
}

/**
 * Bridges reactive game-page UI state into audio side effects.
 *
 * This service keeps the component free of repetitive `effect()` setup for
 * score-step sounds, reshuffle counter sounds, and background music sync.
 */
@Injectable()
export class GamePageAudioStateService {
  private readonly audioManager = inject(GameAudioManager);
  private previousValues: Record<TrackedValueKey, number | null> = {
    scoreDisplay: null,
    reshuffleDraw: null,
    reshuffleDiscard: null,
  };
  private effectsRegistered = false;

  /**
   * Registers one-time reactive bindings between game-page signals and audio.
   *
   * The tracked values are deliberately narrow: only the counters that should
   * emit incremental step sounds and the phase/pause state that drives music.
   */
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

  /** Stops all managed background music when the page is torn down. */
  stopMusic(): void {
    this.audioManager.syncMusic('none');
  }

  /**
   * Plays the upward or downward counter step sound when a tracked value changes.
   *
   * Initial values are treated as baseline state so opening the page does not
   * immediately emit step sounds before any animated change occurs.
   */
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
