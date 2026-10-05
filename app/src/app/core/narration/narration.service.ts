import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Injectable, inject } from '@angular/core';

import { Narrator, type NarratorPoliteness } from '../contracts';
import { SpeechPreferencesStore } from './speech-preferences.store';
import { SpeechSynthesisService } from './speech-synthesis.service';

interface Utterance {
  readonly text: string;
  readonly politeness: NarratorPoliteness;
}

/**
 * Instrada gli annunci verso le regioni aria-live (modalità `sr`) o la voce integrata
 * (modalità `voice`). Prima di parlare spegne l'altro canale, così non si sentono mai due voci.
 */
@Injectable({ providedIn: 'root' })
export class NarrationService extends Narrator {
  private readonly announcer = inject(LiveAnnouncer);
  private readonly speech = inject(SpeechSynthesisService);
  private readonly prefs = inject(SpeechPreferencesStore);

  private last: Utterance | null = null;

  override say(text: string, politeness: NarratorPoliteness = 'polite'): void {
    if (text.trim() === '') {
      return;
    }
    this.last = { text, politeness };

    if (this.prefs.mode() === 'voice') {
      this.announcer.clear();
      // `speak()` cancella già la frase in corso: vale anche per gli avvisi 'assertive'.
      this.speech.speak(text);
    } else {
      this.speech.stop();
      void this.announcer.announce(text, politeness);
    }
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
}
