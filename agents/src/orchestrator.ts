import Anthropic from '@anthropic-ai/sdk';

import type { AssistRequest, AssistResponse } from './contract';
import { runErrorCoach } from './agents/error-coach.agent';
import { runFieldExplainer } from './agents/field-explainer.agent';
import { guardOutput } from './guards/output-guard';

/** Nessuna risposta AI: l'app deve usare le spiegazioni locali. */
export const FALLBACK_RESPONSE: AssistResponse = { text: '', source: 'fallback' };

export interface OrchestratorConfig {
  readonly aiEnabled: boolean;
  readonly apiKey: string | undefined;
}

export interface Orchestrator {
  /** `false` con AI disattivata o senza chiave: ogni richiesta riceve `FALLBACK_RESPONSE`. */
  readonly available: boolean;
  assist(request: AssistRequest, signal: AbortSignal): Promise<AssistResponse>;
}

/**
 * richiesta (già validata) → agente della skill → output-guard.
 * Gli errori dell'AI e dell'output-guard vengono propagati: è il server a tradurli in HTTP.
 */
export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  const client = config.aiEnabled && config.apiKey ? new Anthropic({ apiKey: config.apiKey }) : null;

  return {
    available: client !== null,
    async assist(request, signal) {
      if (!client) {
        return FALLBACK_RESPONSE;
      }
      const raw = await dispatch(client, request, signal);
      if (raw === null) {
        return FALLBACK_RESPONSE;
      }
      return { text: guardOutput(raw), source: 'ai' };
    },
  };
}

function dispatch(client: Anthropic, request: AssistRequest, signal: AbortSignal): Promise<string> | null {
  switch (request.skill) {
    case 'explain':
    case 'rephrase':
    case 'example':
      return runFieldExplainer(client, request, signal);
    case 'error-hint':
      return runErrorCoach(client, request, signal);
    case 'question':
      // Le domande libere (con riconoscimento dell'intent) restano al fallback locale dell'app.
      return null;
  }
}
