export type HandSizeOptions = 3 | 4 | 6;
export interface PlayerSettingsModel {
    handSize: HandSizeOptions; // default 6
    soundEnabled: boolean;
    musicEnabled: boolean;
    animationsEnabled: boolean;
    showTileValues: boolean;
    hasSeenTutorial: boolean;
}
