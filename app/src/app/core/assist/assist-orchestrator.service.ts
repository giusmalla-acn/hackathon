import { Injectable, inject } from '@angular/core';
import { type Observable, catchError, map, take, throwIfEmpty, timeout } from 'rxjs';

import type { AssistRequest, AssistResponse } from '../contracts';
import { AI_ASSIST_PROVIDER, ASSIST_CONFIG } from './assist-provider';
import { FallbackAssistProvider } from './fallback-assist.provider';
import { guardAssistOutput } from './output-guard';
import { guardAssistRequest } from './privacy-guard';

/**
 * Unico punto d'ingresso per l'assistenza.
 *
 * richiesta → privacy-guard → AI (se registrata e `aiEnabled`, con timeout) → output-guard.
 * Qualunque problema (dati sensibili, errore, timeout, risposta scartata) porta al fallback
 * locale: l'Observable emette sempre una risposta e non va mai in errore.
 */
@Injectable()
export class AssistOrchestrator {
  private readonly ai = inject(AI_ASSIST_PROVIDER, { optional: true });
  private readonly fallback = inject(FallbackAssistProvider);
  private readonly config = inject(ASSIST_CONFIG);

  assist(request: AssistRequest): Observable<AssistResponse> {
    let safe: AssistRequest;
    try {
      safe = guardAssistRequest(request);
    } catch {
      // La richiesta non lascia il browser: il fallback lavora solo in locale.
      return this.fallback.assist(request);
    }

    const ai = this.config.aiEnabled ? this.ai : null;
    if (!ai) {
      return this.fallback.assist(safe);
    }

    return ai.assist(safe).pipe(
      take(1),
      timeout(this.config.timeoutMs),
      throwIfEmpty(),
      map((response): AssistResponse => {
        const text = guardAssistOutput(response.text);
        if (text === null) {
          throw new Error('Risposta AI scartata dall\'output-guard.');
        }
        return { text, source: 'ai', ...(response.intent ? { intent: response.intent } : {}) };
      }),
      catchError(() => this.fallback.assist(safe)),
    );
  }
}
