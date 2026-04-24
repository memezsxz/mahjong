export interface PlayerSettingsModel {
    handSize: 3 | 4 | 5; // default 3
    soundEnabled: boolean;
    musicEnabled: boolean;
    showTileValues: boolean;
    playerName: string | null;
}