import { Injectable, signal } from '@angular/core';
import { LeaderboardEntryModel } from '@hbg/shared-models';

/**
 * Handles leaderboard qualification, persistence, and top-score ordering.
 */
@Injectable({ providedIn: 'root' })
export class ScoresService {
  /** Local storage key used to persist leaderboard entries. */
  private static readonly STORAGE_KEY = 'game-scores';
  /** Maximum number of leaderboard entries kept in the top-scores list. */
  private static readonly MAX_SCORES = 5;

  private readonly _topScores = signal<LeaderboardEntryModel[]>([]);
  readonly topScores = this._topScores.asReadonly();

  constructor() {
    this.loadFromLocalCache();
  }

  /**
   * Returns whether a score is high enough to enter the leaderboard.
   */
  qualifiesForLeaderboard(score: number): boolean {
    if (score <= 0) {
      return false;
    }

    const currentScores = this._topScores();
    if (currentScores.length < ScoresService.MAX_SCORES) {
      return true;
    }

    const cutoffScore = currentScores[ScoresService.MAX_SCORES - 1]?.totalScore ?? null;
    if (cutoffScore === null) {
      return true;
    }

    return score >= cutoffScore;
  }

  /**
   * Attempts to submit a score entry to the leaderboard.
   */
  submitScore(playerName: string, totalScore: number): boolean {
    const trimmedName = playerName.trim();
    if (!trimmedName || !this.qualifiesForLeaderboard(totalScore)) {
      return false;
    }

    this.saveScoreEntry({
      playerName: trimmedName,
      totalScore,
      date: Date.now(),
    });
    return true;
  }

  /**
   * Adds a score entry and persists the normalized leaderboard if it qualifies.
   */
  private saveScoreEntry(entry: LeaderboardEntryModel): void {
    if (!this.qualifiesForLeaderboard(entry.totalScore)) {
      return;
    }

    const nextScores = this.normalizeScores([...this._topScores(), entry]);
    this.persistLocalCache(nextScores);
  }

  /**
   * Loads leaderboard entries from local storage.
   */
  private loadFromLocalCache(): void {
    const raw = localStorage.getItem(ScoresService.STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as LeaderboardEntryModel[];
      this._topScores.set(this.normalizeScores(parsed));
    } catch {
      this._topScores.set([]);
    }
  }

  /**
   * Persists the normalized leaderboard to local storage and updates the signal.
   */
  private persistLocalCache(scores: LeaderboardEntryModel[]): void {
    const normalizedScores = this.normalizeScores(scores);
    this._topScores.set(normalizedScores);
    localStorage.setItem(
      ScoresService.STORAGE_KEY,
      JSON.stringify(normalizedScores),
    );
  }

  /**
   * Sorts leaderboard entries by score, then by most recent date, and trims the
   * list to the configured maximum size.
   */
  private normalizeScores(
    scores: LeaderboardEntryModel[],
  ): LeaderboardEntryModel[] {
    return [...scores]
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        return b.date - a.date;
      })
      .slice(0, ScoresService.MAX_SCORES);
  }
}
