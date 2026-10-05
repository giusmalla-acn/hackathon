import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Injectable, inject } from '@angular/core';

import { Narrator, type NarratorPoliteness } from '../contracts';
import { SensitiveNarrator } from './sensitive-narrator';
import { SpeechPreferencesStore } from './speech-preferences.store';
import { SpeechSynthesisService } from './speech-synthesis.service';

/** Dopo questo tempo la regione live si svuota: lo screen reader ha già ricevuto il testo. */
export const SENSITIVE_LIVE_REGION_MS = 3000;

interface Utterance {
  readonly text: string;
  readonly politeness: NarratorPoliteness;
}

/**
 * Instrada gli annunci verso le regioni aria-live (modalità `sr`) o la voce integrata
 * (modalità `voice`). Prima di parlare spegne l'altro canale, così non si sentono mai due voci.
 */
@Injectable({ providedIn: 'root' })
export class NarrationService extends Narrator implements SensitiveNarrator {
  private readonly announcer = inject(LiveAnnouncer);
  private readonly speech = inject(SpeechSynthesisService);
  private readonly prefs = inject(SpeechPreferencesStore);

  private last: Utterance | null = null;

  override say(text: string, politeness: NarratorPoliteness = 'polite'): void {
    if (text.trim() === '') {
      return;
    }
    this.last = { text, politeness };
    this.output(text, politeness);
  }

  /** Come `say()`, ma il testo non resta né in `repeatLast()` né nel DOM. */
  saySensitive(text: string): void {
    if (text.trim() === '') {
      return;
    }
    // Ripetere dopo un annuncio sensibile non deve riproporre né lui né quello precedente.
    this.last = null;
    this.output(text, 'polite', SENSITIVE_LIVE_REGION_MS);
  }

  override stop(): void {
    this.speech.stop();
    this.announcer.clear();
  }

  override repeatLast(): void {
    if (this.last) {
      this.say(this.last.text, this.last.politeness);
    }
  }

  private output(text: string, politeness: NarratorPoliteness, liveRegionMs?: number): void {
    if (this.prefs.mode() === 'voice') {
      this.announcer.clear();
      // `speak()` cancella già la frase in corso: vale anche per gli avvisi 'assertive'.
      this.speech.speak(text);
    } else {
      this.speech.stop();
      void (liveRegionMs === undefined
        ? this.announcer.announce(text, politeness)
        : this.announcer.announce(text, politeness, liveRegionMs));
    }
  }
}
