import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

/** Sottoinsieme della Web Speech API usato qui (non è nei tipi DOM di TypeScript). */
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

export interface SpeechRecognitionResultEventLike {
  readonly results: ArrayLike<ArrayLike<{ readonly transcript: string }>>;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/**
 * Ascolto di una singola domanda a voce.
 *
 * Privacy: in alcuni browser l'audio viene elaborato da un servizio remoto. Per questo il
 * pannello non lo attiva mai sul campo password; la trascrizione non viene salvata né loggata.
 */
@Injectable({ providedIn: 'root' })
export class SpeechRecognitionService {
  private readonly ctor = getRecognitionCtor(inject(DOCUMENT).defaultView);
  private readonly _listening = signal(false);
  private active: SpeechRecognitionLike | null = null;

  readonly supported = this.ctor !== null;
  readonly listening = this._listening.asReadonly();

  /** Emette la trascrizione (se c'è) e completa. Annullare la sottoscrizione interrompe l'ascolto. */
  listenOnce(): Observable<string> {
    return new Observable<string>((subscriber) => {
      if (!this.ctor) {
        subscriber.error(new Error('Riconoscimento vocale non disponibile.'));
        return undefined;
      }
      this.abort();

      const recognition = new this.ctor();
      recognition.lang = 'it-IT';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript.trim();
        if (transcript) {
          subscriber.next(transcript);
        }
      };
      recognition.onerror = () => {
        this.release(recognition);
        subscriber.error(new Error('Riconoscimento vocale interrotto.'));
      };
      recognition.onend = () => {
        this.release(recognition);
        subscriber.complete();
      };

      this.active = recognition;
      this._listening.set(true);
      recognition.start();

      return () => {
        if (this.active === recognition) {
          recognition.abort();
          this.release(recognition);
        }
      };
    });
  }

  abort(): void {
    const recognition = this.active;
    if (recognition) {
      this.release(recognition);
      recognition.abort();
    }
  }

  private release(recognition: SpeechRecognitionLike): void {
    if (this.active === recognition) {
      this.active = null;
      this._listening.set(false);
    }
  }
}

function getRecognitionCtor(view: Window | null): SpeechRecognitionCtor | null {
  const scope = view as (Window & Record<string, unknown>) | null;
  const ctor = scope?.['SpeechRecognition'] ?? scope?.['webkitSpeechRecognition'];
  return typeof ctor === 'function' ? (ctor as SpeechRecognitionCtor) : null;
}
