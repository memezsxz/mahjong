
export type HandSizeOptions = 3 | 4 | 5;
export interface PlayerSettingsModel {
    handSize: HandSizeOptions; // default 3
    soundEnabled: boolean;
    musicEnabled: boolean;
    animationsEnabled: boolean;
    showTileValues: boolean;
    playerName: string | null;
    hasSeenTutorial: boolean;
}
