import { InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

import type { AssistIntent, AssistRequest, AssistResponse, FieldDefinition } from '../contracts';

/** Sorgente di risposte di assistenza (AI o testi locali). Classe astratta per usarla come token di DI. */
export abstract class AssistProvider {
  abstract assist(request: AssistRequest): Observable<AssistResponse>;
}

export const DEFAULT_ASSIST_TIMEOUT_MS = 4000;

export interface AssistConfig {
  /** Se false l'AI non viene mai chiamata, anche se registrata. */
  readonly aiEnabled: boolean;
  /** Oltre questo tempo si usa il fallback locale. */
  readonly timeoutMs: number;
}

export const ASSIST_CONFIG = new InjectionToken<AssistConfig>('ASSIST_CONFIG', {
  factory: () => ({ aiEnabled: false, timeoutMs: DEFAULT_ASSIST_TIMEOUT_MS }),
});

/** Provider AI remoto; facoltativo: senza, l'orchestratore usa solo il fallback. */
export const AI_ASSIST_PROVIDER = new InjectionToken<AssistProvider>('AI_ASSIST_PROVIDER');

/** Testi statici dei campi su cui lavora il fallback locale. */
export const ASSIST_FALLBACK_FIELDS = new InjectionToken<readonly FieldDefinition[]>(
  'ASSIST_FALLBACK_FIELDS',
  { factory: () => [] },
);

export const ASSIST_ENDPOINT = new InjectionToken<string>('ASSIST_ENDPOINT');

const ASSIST_INTENTS: ReadonlySet<string> = new Set<AssistIntent>([
  'answer',
  'repeat',
  'explain',
  'rephrase',
  'example',
  'previous-field',
  'next-field',
  'stop',
  'unknown',
]);

export function isAssistIntent(value: unknown): value is AssistIntent {
  return typeof value === 'string' && ASSIST_INTENTS.has(value);
}
