import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, TimeoutError, catchError, map, take, timeout } from 'rxjs';

import type { AssistRequest, AssistResponse } from '../contracts';
import { ASSIST_CONFIG, ASSIST_ENDPOINT, AssistProvider, isAssistIntent } from './assist-provider';
import { FallbackAssistProvider } from './fallback-assist.provider';
import { guardAssistOutput } from './output-guard';
import { guardAssistRequest } from './privacy-guard';

/**
 * Provider composito: backend AI (`agents/`) con ripiego sul fallback locale.
 *
 * richiesta → privacy-guard → POST con timeout → output-guard. Se la richiesta contiene dati
 * sensibili `assist()` lancia `AssistPrivacyError` e non parte nulla. Errore HTTP, timeout o
 * risposta scartata portano al fallback con un warning in console (solo il motivo, mai i testi).
 */
@Injectable()
export class HttpAssistProvider extends AssistProvider {
  private readonly http = inject(HttpClient);
  private readonly endpoint = inject(ASSIST_ENDPOINT);
  private readonly config = inject(ASSIST_CONFIG);
  private readonly fallback = inject(FallbackAssistProvider);

  override assist(request: AssistRequest): Observable<AssistResponse> {
    const safe = guardAssistRequest(request);
    return this.http.post<AssistResponse>(this.endpoint, safe).pipe(
      take(1),
      timeout(this.config.timeoutMs),
      map(toAiResponse),
      catchError((error: unknown) => {
        console.warn(`[assist] AI non disponibile (${describe(error)}): uso il fallback locale.`);
        return this.fallback.assist(safe);
      }),
    );
  }
}

class AssistResponseError extends Error {}

/** Il corpo arriva da fuori: si accetta solo `{ text: string, intent?: AssistIntent }`. */
function toAiResponse(body: unknown): AssistResponse {
  if (typeof body !== 'object' || body === null) {
    throw new AssistResponseError('risposta non valida');
  }
  const { text: raw, intent } = body as Record<string, unknown>;
  if (typeof raw !== 'string') {
    throw new AssistResponseError('risposta senza testo');
  }
  const text = guardAssistOutput(raw);
  if (text === null) {
    throw new AssistResponseError('testo scartato dall\'output-guard');
  }
  return { text, source: 'ai', ...(isAssistIntent(intent) ? { intent } : {}) };
}

function describe(error: unknown): string {
  if (error instanceof TimeoutError) {
    return 'timeout';
  }
  if (error instanceof HttpErrorResponse) {
    return error.status === 0 ? 'rete' : `HTTP ${error.status}`;
  }
  return error instanceof AssistResponseError ? error.message : 'errore imprevisto';
}
