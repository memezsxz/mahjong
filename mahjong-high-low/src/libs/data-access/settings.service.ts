import {Injectable, signal} from "@angular/core";
import {PlayerSettingsModel} from "@hbg/shared-models";
import {DEFAULT_HAND_SIZE} from "@hbg/shared-util-game";

@Injectable({providedIn: 'root'})
export class SettingsService {
    private readonly STORAGE_KEY = 'player-settings';
    private readonly VALID_HAND_SIZES = new Set([3, 4, 6]);

    private _settings = signal<PlayerSettingsModel>({
        handSize: DEFAULT_HAND_SIZE, musicEnabled: true, soundEnabled: true, animationsEnabled: true, showTileValues: true, hasSeenTutorial: false
    });

    readonly settings = this._settings.asReadonly();

    constructor() {
        this.load()
    }

    update(settings: Partial<PlayerSettingsModel>) {
        this._settings.update((current) => this.normalizeSettings({...current, ...settings}));
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._settings()))
    }

    isFirstTime(): boolean {
        return !this._settings().hasSeenTutorial;
    }

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

    private normalizeSettings(settings: PlayerSettingsModel): PlayerSettingsModel {
        return {
            ...settings,
            handSize: this.VALID_HAND_SIZES.has(settings.handSize) ? settings.handSize : DEFAULT_HAND_SIZE,
        };
    }
}
