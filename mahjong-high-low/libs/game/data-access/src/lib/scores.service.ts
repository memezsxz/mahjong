import { Injectable, signal } from '@angular/core';
import { LeaderboardEntryModel } from '@hbg/shared-models';

@Injectable({ providedIn: 'root' })
export class ScoresService {
  private readonly STORAGE_KEY = 'game-scores';
  private readonly MAX_SCORES = 5;

  private readonly _topScores = signal<LeaderboardEntryModel[]>([]);
  readonly topScores = this._topScores.asReadonly();

  constructor() {
    this.load();
  }

  qualifiesForLeaderboard(score: number): boolean {
    if (score <= 0) {
      return false;
    }

    const currentScores = this._topScores();
    if (currentScores.length < this.MAX_SCORES) {
      return true;
    }

    const cutoffScore = currentScores[this.MAX_SCORES - 1]?.totalScore ?? null;
    if (cutoffScore === null) {
      return true;
    }

    return score >= cutoffScore;
  }

  saveScore(entry: LeaderboardEntryModel): LeaderboardEntryModel {
    if (!this.qualifiesForLeaderboard(entry.totalScore)) {
      return entry;
    }

    const nextScores = [...this._topScores(), entry]
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        return b.date - a.date;
      })
      .slice(0, this.MAX_SCORES);

    this._topScores.set(nextScores);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nextScores));
    return entry;
  }

  private load(): void {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as LeaderboardEntryModel[];
      this._topScores.set(
        [...parsed]
          .sort((a, b) => {
            if (b.totalScore !== a.totalScore) {
              return b.totalScore - a.totalScore;
            }
            return b.date - a.date;
          })
          .slice(0, this.MAX_SCORES),
      );
    } catch {
      this._topScores.set([]);
    }
  }
}
