import { type EnvironmentProviders, type Provider, makeEnvironmentProviders } from '@angular/core';

import type { FieldDefinition } from '../contracts';
import {
  AI_ASSIST_PROVIDER,
  ASSIST_CONFIG,
  ASSIST_ENDPOINT,
  ASSIST_FALLBACK_FIELDS,
  type AssistConfig,
  DEFAULT_ASSIST_TIMEOUT_MS,
} from './assist-provider';
import { AssistOrchestrator } from './assist-orchestrator.service';
import { FallbackAssistProvider } from './fallback-assist.provider';
import { HttpAssistProvider } from './http-assist.provider';

export interface AssistOptions {
  /** URL del backend AI. Senza, si usa solo il fallback. Richiede `provideHttpClient()`. */
  readonly endpoint?: string;
  /** Predefinito: true se c'è un `endpoint`. */
  readonly aiEnabled?: boolean;
  /** Predefinito: 4000 ms. */
  readonly timeoutMs?: number;
}

/**
 * Registra l'assistenza: `inject(AssistOrchestrator)`.
 *
 * @param fallback testi statici dei campi, usati quando l'AI è spenta, lenta o in errore.
 */
export function provideAssist(
  fallback: readonly FieldDefinition[],
  options: AssistOptions = {},
): EnvironmentProviders {
  const config: AssistConfig = {
    aiEnabled: options.aiEnabled ?? options.endpoint !== undefined,
    timeoutMs: options.timeoutMs ?? DEFAULT_ASSIST_TIMEOUT_MS,
  };
  const providers: Provider[] = [
    { provide: ASSIST_FALLBACK_FIELDS, useValue: fallback },
    { provide: ASSIST_CONFIG, useValue: config },
    FallbackAssistProvider,
    AssistOrchestrator,
  ];
  if (options.endpoint !== undefined) {
    providers.push(
      { provide: ASSIST_ENDPOINT, useValue: options.endpoint },
      { provide: AI_ASSIST_PROVIDER, useClass: HttpAssistProvider },
    );
  }
  return makeEnvironmentProviders(providers);
}
