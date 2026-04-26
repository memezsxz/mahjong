import {Injectable, signal} from "@angular/core";
import {PlayerSettingsModel} from "@hbg/shared-models";
import {DEFAULT_HAND_SIZE} from "@hbg/shared-util-game";

@Injectable({providedIn: 'root'})
export class SettingsService {
    private readonly STORAGE_KEY = 'player-settings';

    private _settings = signal<PlayerSettingsModel>({
        handSize: DEFAULT_HAND_SIZE, musicEnabled: true, soundEnabled: true, animationsEnabled: true, playerName: '', showTileValues: true, hasSeenTutorial: false
    });

    readonly settings = this._settings.asReadonly();

    constructor() {
        this.load()
    }

    update(settings: Partial<PlayerSettingsModel>) {
        this._settings.update((current) => ({...current, ...settings}));
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._settings()))
    }

    isFirstTime(): boolean {
        return !this._settings().hasSeenTutorial;
    }

    private load() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            this._settings.set(JSON.parse(stored))
        }
    }
}
