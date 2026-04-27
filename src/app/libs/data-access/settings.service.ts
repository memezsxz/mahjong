import {Injectable, signal} from "@angular/core";
import {PlayerSettingsModel} from "@hbg/shared-models";
import {DEFAULT_HAND_SIZE, VALID_HAND_SIZES} from "@hbg/shared-util-game";

/**
 * Stores, normalizes, and persists player-facing settings.
 */
@Injectable({providedIn: 'root'})
export class SettingsService {
    /** Local storage key used to persist player settings. */
    private readonly STORAGE_KEY = 'player-settings';
    /** Valid hand sizes accepted by the settings normalization path. */
    private readonly VALID_HAND_SIZES = new Set(VALID_HAND_SIZES);

    private _settings = signal<PlayerSettingsModel>({
        handSize: DEFAULT_HAND_SIZE, musicEnabled: true, soundEnabled: true, animationsEnabled: true, showTileValues: true, hasSeenTutorial: false
    });

    readonly settings = this._settings.asReadonly();

    constructor() {
        this.load()
    }

    /**
     * Merges a partial settings update, normalizes it, and persists it.
     */
    update(settings: Partial<PlayerSettingsModel>) {
        this._settings.update((current) => this.normalizeSettings({...current, ...settings}));
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._settings()))
    }

    /**
     * Returns whether the player has not yet completed the first-time flow.
     */
    isFirstTime(): boolean {
        return !this._settings().hasSeenTutorial;
    }

    /**
     * Loads persisted settings from local storage if available.
     */
    private load() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as Partial<PlayerSettingsModel> & { playerName?: string | null };
            const { playerName, ...rest } = parsed;
            void playerName;
            this._settings.set(this.normalizeSettings({
                ...this._settings(),
                ...rest,
            }))
        }
    }

    /**
     * Normalizes settings values against the supported configuration.
     */
    private normalizeSettings(settings: PlayerSettingsModel): PlayerSettingsModel {
        return {
            ...settings,
            handSize: this.VALID_HAND_SIZES.has(settings.handSize) ? settings.handSize : DEFAULT_HAND_SIZE,
        };
    }
}
