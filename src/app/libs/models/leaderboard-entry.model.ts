export interface LeaderboardEntryModel {
    playerName: string;
    totalScore: number;
    // Unix epoch milliseconds used for ordering and display across app and API boundaries.
    date: number
}
