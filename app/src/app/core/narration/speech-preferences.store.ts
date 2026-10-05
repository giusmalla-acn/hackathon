import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type NarrationMode = 'sr' | 'voice';

export const SPEECH_RATE_MIN = 0.8;
export const SPEECH_RATE_MAX = 1.2;
export const SPEECH_RATE_DEFAULT = 1;

export const A11Y_PREFS_STORAGE_KEY = 'a11y-prefs';

/** Unica forma salvata in localStorage: solo preferenze, mai valori del form. */
interface PersistedPrefs {
  readonly mode: NarrationMode;
  readonly rate: number;
}

function isMode(value: unknown): value is NarrationMode {
  return value === 'sr' || value === 'voice';
}

function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) {
    return SPEECH_RATE_DEFAULT;
  }
  return Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, rate));
}

/**
 * Preferenze di narrazione dell'utente.
 *
 * Privacy: persiste solo `mode` e `rate`; `voiceUri` resta in memoria.
 */
@Injectable({ providedIn: 'root' })
export class SpeechPreferencesStore {
  private readonly storage = getStorage(inject(DOCUMENT).defaultView);

  private readonly _mode = signal<NarrationMode>('sr');
  private readonly _rate = signal(SPEECH_RATE_DEFAULT);
  private readonly _voiceUri = signal<string | null>(null);

  readonly mode = this._mode.asReadonly();
  readonly rate = this._rate.asReadonly();
  readonly voiceUri = this._voiceUri.asReadonly();

  constructor() {
    const saved = this.read();
    if (saved) {
      this._mode.set(saved.mode);
      this._rate.set(saved.rate);
    }
  }

  setMode(mode: NarrationMode): void {
    this._mode.set(mode);
    this.write();
  }

  setRate(rate: number): void {
    this._rate.set(clampRate(rate));
    this.write();
  }

  setVoiceUri(voiceUri: string | null): void {
    this._voiceUri.set(voiceUri);
  }

  private read(): PersistedPrefs | null {
    try {
      const raw = this.storage?.getItem(A11Y_PREFS_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }
      const { mode, rate } = parsed as Record<string, unknown>;
      return {
        mode: isMode(mode) ? mode : 'sr',
        rate: typeof rate === 'number' ? clampRate(rate) : SPEECH_RATE_DEFAULT,
      };
    } catch {
      return null;
    }
  }

  private write(): void {
    const prefs: PersistedPrefs = { mode: this._mode(), rate: this._rate() };
    try {
      this.storage?.setItem(A11Y_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Storage pieno o bloccato (navigazione privata): le preferenze restano in memoria.
    }
  }
}

function getStorage(view: Window | null): Storage | null {
  try {
    return view?.localStorage ?? null;
  } catch {
    return null;
  }
}
