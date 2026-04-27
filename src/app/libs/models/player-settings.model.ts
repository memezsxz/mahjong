export type HandSizeOptions = 3 | 4 | 6;
export interface PlayerSettingsModel {
    // Supported hand sizes only; defaults belong in the rules/config layer, not in this contract file.
    handSize: HandSizeOptions;
    soundEnabled: boolean;
    musicEnabled: boolean;
    animationsEnabled: boolean;
    showTileValues: boolean;
    hasSeenTutorial: boolean;
}
