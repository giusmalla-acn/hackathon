import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';

import type { AssistRequest, AssistResponse } from '../contracts';
import { ASSIST_ENDPOINT, AssistProvider, isAssistIntent } from './assist-provider';

/**
 * Chiama il backend AI (`agents/`). Va usato solo tramite `AssistOrchestrator`, che filtra la
 * richiesta con il privacy-guard e la risposta con l'output-guard.
 */
@Injectable()
export class HttpAssistProvider extends AssistProvider {
  private readonly http = inject(HttpClient);
  private readonly endpoint = inject(ASSIST_ENDPOINT);

  override assist(request: AssistRequest): Observable<AssistResponse> {
    return this.http.post<unknown>(this.endpoint, request).pipe(map(parseAssistResponse));
  }
}

/** Il corpo arriva da fuori: si accetta solo `{ text: string, intent?: AssistIntent }`. */
function parseAssistResponse(body: unknown): AssistResponse {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Risposta di assistenza non valida.');
  }
  const { text, intent } = body as Record<string, unknown>;
  if (typeof text !== 'string') {
    throw new Error('Risposta di assistenza senza testo.');
  }
  return { text, source: 'ai', ...(isAssistIntent(intent) ? { intent } : {}) };
}
