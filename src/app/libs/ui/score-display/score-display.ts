import { Component, effect, input, OnDestroy, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { UI_SCORE_STEP_MS } from '../game-ui.animations';

/**
 * Displays the current score and animates stepped score changes.
 */
@Component({
  selector: 'lib-score-display',
  imports: [DecimalPipe],
  templateUrl: './score-display.html',
  styleUrl: './score-display.css',
  standalone: true
})
export class ScoreDisplay implements OnDestroy {
  private readonly scoreStepMs = UI_SCORE_STEP_MS;
  score = input.required<number>();
  winStreak = input.required<number>();
  scoreStepSoundRequested = output<void>();
  scoreStepping = signal(false);
  scoreStepDirection = signal<'up' | 'down'>('down');
  currentScore = signal<number | null>(null);
  private scoreStepTimer: ReturnType<typeof setTimeout> | null = null;

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

  /**
   * Steps the displayed score toward its target value one point at a time.
   */
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
      this.scoreStepSoundRequested.emit();
      this.currentScore.set(nextValue);
      this.scoreStepTimer = setTimeout(() => tick(nextValue), this.scoreStepMs);
    };

    tick(from);
  }

  /**
   * Clears any in-flight stepped score animation.
   */
  private clearScoreStepTimer(): void {
    if (this.scoreStepTimer !== null) {
      clearTimeout(this.scoreStepTimer);
      this.scoreStepTimer = null;
    }
  }
}
