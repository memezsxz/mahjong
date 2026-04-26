import { Component, effect, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'lib-score-display',
  imports: [DecimalPipe],
  templateUrl: './score-display.html',
  styleUrl: './score-display.css',
})
export class ScoreDisplay {
  private readonly scoreStepMs = 70;
  private readonly scoreStepSoundVolume = 0.12;
  private readonly scoreStepSoundTailPaddingMs = 35;
  score = input.required<number>();
  winStreak = input.required<number>();
  soundEnabled = input<boolean>(false);
  scoreStepping = signal(false);
  scoreStepDirection = signal<'up' | 'down'>('down');
  currentScore = signal<number | null>(null);
  private scoreStepTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly numberChangeSoundSrc = 'assets/sounds/number_change.mp3';

  constructor() {
    effect(() => {
      const nextScore = this.score();
      const currentScore = this.currentScore();
      if (currentScore === null) {
        this.currentScore.set(nextScore);
        return;
      }
      if (currentScore === nextScore) {
        return;
      }

      this.startScoreStep(currentScore, nextScore);
    });
  }

  ngOnDestroy(): void {
    this.clearScoreStepTimer();
  }

  private startScoreStep(from: number, to: number): void {
    this.clearScoreStepTimer();
    const direction = to > from ? 1 : -1;
    this.scoreStepDirection.set(direction > 0 ? 'up' : 'down');
    this.scoreStepping.set(true);

    const tick = (value: number) => {
      if (value === to) {
        this.currentScore.set(to);
        this.scoreStepping.set(false);
        this.scoreStepTimer = null;
        return;
      }

      const nextValue = value + direction;
      this.playStepSound();
      this.currentScore.set(nextValue);
      this.scoreStepTimer = setTimeout(() => tick(nextValue), this.scoreStepMs);
    };

    tick(from);
  }

  private clearScoreStepTimer(): void {
    if (this.scoreStepTimer !== null) {
      clearTimeout(this.scoreStepTimer);
      this.scoreStepTimer = null;
    }
  }

  private playStepSound(): void {
    if (!this.soundEnabled() || typeof Audio === 'undefined') {
      return;
    }

    const audio = new Audio(this.numberChangeSoundSrc);
    const clipDurationMs = this.scoreStepMs + this.scoreStepSoundTailPaddingMs;
    audio.preload = 'metadata';
    audio.volume = this.scoreStepSoundVolume;

    const playTail = () => {
      const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : clipDurationMs;
      const startAtSeconds = Math.max(0, (durationMs - clipDurationMs) / 1000);
      audio.currentTime = startAtSeconds;
      audio.play().catch(() => undefined);
      window.setTimeout(() => {
        audio.pause();
      }, clipDurationMs + 20);
    };

    if (audio.readyState >= 1) {
      playTail();
      return;
    }

    audio.addEventListener('loadedmetadata', playTail, { once: true });
    audio.load();
  }
}
