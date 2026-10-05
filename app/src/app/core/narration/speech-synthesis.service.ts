import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';

import { SpeechPreferencesStore } from './speech-preferences.store';

const PREFERRED_LANG = 'it-IT';

/** `null` dove la Web Speech API non esiste (SSR, jsdom, browser datati). */
export const SPEECH_SYNTHESIS = new InjectionToken<SpeechSynthesis | null>('SPEECH_SYNTHESIS', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).defaultView?.speechSynthesis ?? null,
});

/**
 * Voce integrata basata su `speechSynthesis`.
 *
 * Privacy: il testo resta nel browser e non viene inoltrato all'AI.
 */
@Injectable({ providedIn: 'root' })
export class SpeechSynthesisService {
  private readonly synth = inject(SPEECH_SYNTHESIS);
  private readonly prefs = inject(SpeechPreferencesStore);

  private readonly _voices = signal<readonly SpeechSynthesisVoice[]>([]);
  private readonly _speaking = signal(false);
  private current: SpeechSynthesisUtterance | null = null;

  readonly supported = this.synth !== null;
  readonly voices = this._voices.asReadonly();
  readonly speaking = this._speaking.asReadonly();
  /** `null` finché il browser non ha caricato le voci. */
  readonly voice = computed(() => selectVoice(this._voices(), this.prefs.voiceUri()));

  constructor() {
    const synth = this.synth;
    if (!synth) {
      return;
    }
    const onVoicesChanged = (): void => this._voices.set(synth.getVoices());
    synth.addEventListener('voiceschanged', onVoicesChanged);
    inject(DestroyRef).onDestroy(() => synth.removeEventListener('voiceschanged', onVoicesChanged));

    // Chrome restituisce [] fino a `voiceschanged`; Firefox e Safari hanno già le voci
    // e possono non emettere mai l'evento.
    const loaded = synth.getVoices();
    if (loaded.length > 0) {
      this._voices.set(loaded);
    }
  }

  /** Interrompe la frase in corso e pronuncia `text`. */
  speak(text: string): void {
    const synth = this.synth;
    if (!synth || text.trim() === '') {
      return;
    }
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.voice();
    if (voice) {
      utterance.voice = voice;
    }
    // Senza voci caricate il browser sceglie la voce di default per la lingua.
    utterance.lang = voice?.lang ?? PREFERRED_LANG;
    utterance.rate = this.prefs.rate();

    // `cancel()` fa terminare la frase precedente in modo asincrono: ignora i suoi eventi.
    const finish = (): void => {
      if (this.current === utterance) {
        this.current = null;
        this._speaking.set(false);
      }
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    this.current = utterance;
    this._speaking.set(true);
    synth.speak(utterance);
  }

  stop(): void {
    if (!this.synth) {
      return;
    }
    this.current = null;
    this.synth.cancel();
    this._speaking.set(false);
  }
}

function normalizeLang(lang: string): string {
  return lang.replace('_', '-').toLowerCase();
}

/** Voce scelta dall'utente, poi it-IT, poi un'altra variante di italiano, poi la prima disponibile. */
function selectVoice(
  voices: readonly SpeechSynthesisVoice[],
  voiceUri: string | null,
): SpeechSynthesisVoice | null {
  const preferred = PREFERRED_LANG.toLowerCase();
  return (
    (voiceUri ? voices.find((v) => v.voiceURI === voiceUri) : undefined) ??
    voices.find((v) => normalizeLang(v.lang) === preferred) ??
    voices.find((v) => normalizeLang(v.lang).split('-')[0] === 'it') ??
    voices[0] ??
    null
  );
}
