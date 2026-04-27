import { Injectable, effect, inject } from '@angular/core';
import { SettingsService } from './settings.service';

type MusicMode = 'none' | 'gameplay' | 'pause';
type MusicTrack = 'gameplay' | 'pause';
type ResultSound = 'win' | 'lose';
interface PendingAssetPlayback {
  src: string;
  volume: number;
  requestedAtMs: number;
  offsetMs: number;
}

/**
 * Central audio controller for the game.
 *
 * This service coordinates:
 * - music state based on gameplay/pause state,
 * - one-shot sound effects for tile motion, reveals, scoring, and results,
 * - browser audio unlock behavior after the first user interaction,
 * - cached media playback for repeated assets.
 */
@Injectable({ providedIn: 'root' })
export class GameAudioManager {
  /** Volume used for gameplay background music. */
  private readonly gameplayMusicVolume = 0.24;
  /** Volume used for pause-state background music. */
  private readonly pauseMusicVolume = 0.34;
  /** Volume used for the UI button click tone. */
  private readonly buttonVolume = 0.035;
  /** Volume used for tile slide in/out sounds. */
  private readonly tileSlideVolume = 0.32;
  private readonly settingsService = inject(SettingsService);
  /** Source map for looping music tracks. */
  private readonly musicSources: Record<MusicTrack, string> = {
    gameplay: 'assets/sounds/game_loop_music.mp3',
    pause: 'assets/sounds/pause_music.mp3',
  };
  /** Source map for end-of-bet result sounds. */
  private readonly resultSources: Record<ResultSound, string> = {
    win: 'assets/sounds/win.mp3',
    lose: 'assets/sounds/lose.mp3',
  };
  /** Sound file used when a tile value changes. */
  private readonly cardValueChangeSource = 'assets/sounds/card_value_change.mp3';
  /** Sound file used for stepped numeric updates. */
  private readonly scoreStepSource = 'assets/sounds/number_change.mp3';
  /** Volume used for stepped numeric update sounds. */
  private readonly scoreStepVolume = 0.12;
  /** Tail length kept when playing the stepped score sound. */
  private readonly scoreStepTailPaddingMs = 40;
  /** Sound file used for tile slide movement. */
  private readonly tileSlideSource = 'assets/sounds/piece_slide.mp3';
  /** Pool of tile-flip sound variations. */
  private readonly tileFlipSources = [
    'assets/sounds/piece_flip_1.mp3',
    'assets/sounds/piece_flip_2.mp3',
    'assets/sounds/piece_flip_3.mp3',
    'assets/sounds/piece_flip_4.mp3',
    'assets/sounds/piece_flip_5.mp3',
  ];

  private activeMusicMode: MusicMode = 'none';
  private desiredMusicMode: MusicMode = 'none';
  private activeMusic: HTMLAudioElement | null = null;
  private unlocked = false;
  private mediaUnlockRequested = false;
  private mediaPlaybackReady = false;
  private audioContext: AudioContext | null = null;
  private musicCache = new Map<string, HTMLAudioElement>();
  private lastTileFlipIndex = -1;
  private pendingAssetPlaybacks: PendingAssetPlayback[] = [];
  private interactionListenersAttached = false;
  private readonly boundInteractionUnlock = () => this.registerInteraction();

  constructor() {
    this.attachInteractionUnlockListeners();

    effect(() => {
      if (!this.settingsService.settings().musicEnabled) {
        this.stopMusic();
        return;
      }

      this.applyMusicState();
    });
  }

  /**
   * Unlocks browser audio after a user gesture and applies the current music state.
   */
  registerInteraction(): void {
    this.unlocked = true;
    this.resumeAudioContext();
    this.unlockMediaPlayback();
    this.applyMusicState();
  }

  /**
   * Requests the target music mode for the current game state.
   */
  syncMusic(mode: MusicMode): void {
    this.desiredMusicMode = mode;
    this.applyMusicState();
  }

  /**
   * Stops any currently active looping music track and resets playback position.
   */
  stopMusic(): void {
    if (this.activeMusic) {
      this.activeMusic.pause();
      this.activeMusic.currentTime = 0;
      this.activeMusic = null;
    }
    this.activeMusicMode = 'none';
  }

  /**
   * Plays the UI click sound used for button interactions.
   */
  playButtonClick(): void {
    this.playTone(700, 0.035, 'square', this.buttonVolume);
  }

  /**
   * Plays the tile slide-in sound used for deal/promotion/incoming motion.
   */
  playTileIn(count = 1): void {
    void count;
    this.playAsset(this.tileSlideSource, this.tileSlideVolume);
  }

  /**
   * Plays the tile slide-out sound used when the visible hand exits.
   */
  playTileOut(): void {
    this.playAsset(this.tileSlideSource, this.tileSlideVolume);
  }

  /**
   * Plays a randomized tile-flip sound variation.
   */
  playTileFlip(): void {
    this.playAsset(this.getNextTileFlipSource(), 0.34);
  }

  /**
   * Plays the sound used when a tile's displayed value changes.
   */
  playCardValueChange(): void {
    this.playAsset(this.cardValueChangeSource, 0.24);
  }

  /**
   * Plays the clipped tail of the stepped numeric sound effect.
   */
  playScoreStep(): void {
    this.playAssetTail(this.scoreStepSource, this.scoreStepVolume, this.scoreStepTailPaddingMs);
  }

  /**
   * Plays the positive score-change tone.
   */
  playScoreIncrease(): void {
    this.playTone(760, 0.12, 'sine', 0.055, 980);
  }

  /**
   * Plays the negative score-change tone.
   */
  playScoreDecrease(): void {
    this.playTone(520, 0.12, 'sine', 0.055, 320);
  }

  /**
   * Plays the win result sound.
   */
  playWin(): void {
    this.playAsset(this.resultSources.win, 0.8);
  }

  /**
   * Plays the lose result sound.
   */
  playLose(): void {
    this.playAsset(this.resultSources.lose, 0.82);
  }

  /**
   * Applies the desired music state if audio is unlocked and music is enabled.
   */
  private applyMusicState(): void {
    if (!this.unlocked || !this.settingsService.settings().musicEnabled) {
      this.stopMusic();
      return;
    }

    if (this.desiredMusicMode === 'none') {
      this.stopMusic();
      return;
    }

    if (this.activeMusicMode === this.desiredMusicMode && this.activeMusic) {
      return;
    }

    const nextTrack = this.getMusicTrack(this.desiredMusicMode);
    if (!nextTrack) {
      this.stopMusic();
      return;
    }

    this.stopMusic();
    const audio = this.getCachedMusic(nextTrack);
    audio.currentTime = 0;
    audio.loop = true;
    audio.volume = nextTrack === 'pause' ? this.pauseMusicVolume : this.gameplayMusicVolume;
    audio.play().catch(() => undefined);
    this.activeMusic = audio;
    this.activeMusicMode = this.desiredMusicMode;
  }

  /**
   * Maps a requested music mode to a concrete music track.
   */
  private getMusicTrack(mode: MusicMode): MusicTrack | null {
    // if (mode === 'gameplay') return 'gameplay';
    if (mode === 'pause') return 'pause';
    return null;
  }

  /**
   * Returns a cached HTMLAudioElement for a looping music track.
   */
  private getCachedMusic(track: MusicTrack): HTMLAudioElement {
    const src = this.musicSources[track];
    const cached = this.musicCache.get(src);
    if (cached) {
      return cached;
    }

    const audio = new Audio(src);
    audio.preload = 'auto';
    this.musicCache.set(src, audio);
    return audio;
  }

  /**
   * Picks the next tile-flip sound source while avoiding immediate repeats when possible.
   */
  private getNextTileFlipSource(): string {
    if (this.tileFlipSources.length === 1) {
      return this.tileFlipSources[0];
    }

    let nextIndex = Math.floor(Math.random() * this.tileFlipSources.length);
    if (nextIndex === this.lastTileFlipIndex) {
      nextIndex = (nextIndex + 1) % this.tileFlipSources.length;
    }

    this.lastTileFlipIndex = nextIndex;
    return this.tileFlipSources[nextIndex];
  }

  /**
   * Plays an asset immediately from the beginning.
   */
  private playAsset(src: string, volume: number): void {
    this.playAssetAtOffset(src, volume, 0);
  }

  /**
   * Plays an asset after an optional time offset, queuing it until media
   * playback is unlocked if needed.
   */
  private playAssetAtOffset(src: string, volume: number, offsetSeconds: number): void {
    if (!this.settingsService.settings().soundEnabled || !this.unlocked) {
      return;
    }

    if (!this.mediaPlaybackReady) {
      this.pendingAssetPlaybacks.push({
        src,
        volume,
        requestedAtMs: this.nowMs(),
        offsetMs: offsetSeconds * 1000,
      });
      this.unlockMediaPlayback();
      return;
    }

    window.setTimeout(() => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = volume;
      audio.play().catch(() => undefined);
    }, offsetSeconds * 1000);
  }

  /**
   * Plays only the tail portion of an asset after metadata becomes available.
   */
  private playAssetTail(src: string, volume: number, clipDurationMs: number): void {
    if (!this.settingsService.settings().soundEnabled || !this.unlocked) {
      return;
    }

    if (!this.mediaPlaybackReady) {
      this.pendingAssetPlaybacks.push({
        src,
        volume,
        requestedAtMs: this.nowMs(),
        offsetMs: 0,
      });
      this.unlockMediaPlayback();
      return;
    }

    const audio = new Audio(src);
    audio.preload = 'metadata';
    audio.volume = volume;

    const playTail = () => {
      const durationMs = Number.isFinite(audio.duration) ? audio.duration * 1000 : clipDurationMs;
      const startAtSeconds = Math.max(0, (durationMs - clipDurationMs) / 1000);
      audio.currentTime = startAtSeconds;
      audio.play().catch(() => undefined);
      window.setTimeout(() => {
        audio.pause();
      }, clipDurationMs + 20);
    };

    if (audio.readyState >= 1) {
      playTail();
      return;
    }

    audio.addEventListener('loadedmetadata', playTail, { once: true });
    audio.load();
  }

  /**
   * Convenience wrapper for scheduling a synthesized tone immediately.
   */
  private playTone(
    frequency: number,
    durationSeconds: number,
    type: OscillatorType,
    volume: number,
    frequencyEnd?: number,
  ): void {
    this.playToneAtOffset(frequency, durationSeconds, type, volume, 0, frequencyEnd);
  }

  /**
   * Schedules a synthesized tone through the Web Audio API.
   */
  private playToneAtOffset(
    frequency: number,
    durationSeconds: number,
    type: OscillatorType,
    volume: number,
    offsetSeconds: number,
    frequencyEnd?: number,
  ): void {
    if (!this.settingsService.settings().soundEnabled || !this.unlocked) {
      return;
    }

    const context = this.getAudioContext();
    if (!context) return;

    const now = context.currentTime + offsetSeconds;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (frequencyEnd !== undefined) {
      oscillator.frequency.linearRampToValueAtTime(frequencyEnd, now + durationSeconds);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + durationSeconds);
  }

  /**
   * Returns a lazily created AudioContext when available in the browser.
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null;
    }

    if (this.audioContext) {
      return this.audioContext;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    this.audioContext = new AudioContextCtor();
    return this.audioContext;
  }

  /**
   * Resumes a suspended AudioContext after user interaction.
   */
  private resumeAudioContext(): void {
    const context = this.getAudioContext();
    if (!context || context.state !== 'suspended') return;
    context.resume().catch(() => undefined);
  }

  /**
   * Attaches one-time global interaction listeners used to unlock audio.
   */
  private attachInteractionUnlockListeners(): void {
    if (this.interactionListenersAttached || typeof window === 'undefined') {
      return;
    }

    this.interactionListenersAttached = true;
    const options: AddEventListenerOptions = { passive: true };

    window.addEventListener('pointerdown', this.boundInteractionUnlock, options);
    window.addEventListener('keydown', this.boundInteractionUnlock, options);
    window.addEventListener('touchstart', this.boundInteractionUnlock, options);
  }

  /**
   * Removes the temporary global interaction listeners once audio is unlocked.
   */
  private detachInteractionUnlockListeners(): void {
    if (!this.interactionListenersAttached || typeof window === 'undefined') {
      return;
    }

    window.removeEventListener('pointerdown', this.boundInteractionUnlock);
    window.removeEventListener('keydown', this.boundInteractionUnlock);
    window.removeEventListener('touchstart', this.boundInteractionUnlock);
    this.interactionListenersAttached = false;
  }

  /**
   * Attempts a muted playback to unlock browser media playback for future assets.
   */
  private unlockMediaPlayback(): void {
    if (this.mediaPlaybackReady || this.mediaUnlockRequested || typeof Audio === 'undefined') {
      return;
    }

    this.mediaUnlockRequested = true;
    const audio = new Audio(this.tileSlideSource);
    audio.preload = 'auto';
    audio.muted = true;
    audio.volume = 0;
    audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        this.mediaPlaybackReady = true;
        this.detachInteractionUnlockListeners();
        this.flushPendingAssetPlaybacks();
      })
      .catch(() => {
        this.mediaUnlockRequested = false;
      });
  }

  /**
   * Flushes any asset play requests that were queued before media playback was ready.
   */
  private flushPendingAssetPlaybacks(): void {
    if (this.pendingAssetPlaybacks.length === 0) {
      return;
    }

    const queuedPlaybacks = [...this.pendingAssetPlaybacks];
    this.pendingAssetPlaybacks = [];
    const nowMs = this.nowMs();

    for (const playback of queuedPlaybacks) {
      const elapsedMs = nowMs - playback.requestedAtMs;
      const remainingMs = Math.max(0, playback.offsetMs - elapsedMs);

      window.setTimeout(() => {
        const audio = new Audio(playback.src);
        audio.preload = 'auto';
        audio.volume = playback.volume;
        audio.play().catch(() => undefined);
      }, remainingMs);
    }
  }

  /**
   * Returns the current high-resolution timestamp in milliseconds.
   */
  private nowMs(): number {
    if (typeof performance !== 'undefined') {
      return performance.now();
    }

    return Date.now();
  }
}
