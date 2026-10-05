import 'dotenv/config';

import { APIError } from '@anthropic-ai/sdk';
import express, { type ErrorRequestHandler, type Express } from 'express';

import type { AssistResponse } from './contract';
import { OutputGuardError } from './guards/output-guard';
import { type Orchestrator, createOrchestrator } from './orchestrator';
import { InvalidRequestError, validateAssistRequest } from './validate-request';

export const ASSIST_TIMEOUT_MS = 4000;

type ErrorCode = 'invalid-request' | 'ai-unavailable' | 'ai-timeout' | 'ai-error' | 'output-rejected';

/**
 * Le risposte d'errore portano solo un codice: l'app usa il fallback locale per qualunque errore.
 * Nei log finiscono solo codice e tipo dell'errore, mai il corpo della richiesta o il testo AI.
 */
function fail(res: express.Response, status: number, error: ErrorCode): void {
  res.status(status).json({ error });
}

export function createApp(orchestrator: Orchestrator): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/assist', async (req, res) => {
    let request;
    try {
      request = validateAssistRequest(req.body);
    } catch (error) {
      if (error instanceof InvalidRequestError) {
        console.warn(`[assist] 400 ${error.path}`);
        return fail(res, 400, 'invalid-request');
      }
      throw error;
    }

    const signal = AbortSignal.timeout(ASSIST_TIMEOUT_MS);
    let response: AssistResponse;
    try {
      response = await orchestrator.assist(request, signal);
    } catch (error) {
      if (signal.aborted) {
        console.warn(`[assist] 504 ${request.skill}`);
        return fail(res, 504, 'ai-timeout');
      }
      if (error instanceof OutputGuardError) {
        console.warn(`[assist] 502 ${request.skill} output-guard:${error.reason}`);
        return fail(res, 502, 'output-rejected');
      }
      const status = error instanceof APIError && error.status ? ` status:${error.status}` : '';
      console.error(`[assist] 502 ${request.skill} ${error instanceof Error ? error.constructor.name : 'unknown'}${status}`);
      return fail(res, 502, 'ai-error');
    }

    if (response.source === 'fallback') {
      return fail(res, 503, 'ai-unavailable');
    }
    res.json(response);
  });

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    // JSON malformato o corpo troppo grande arrivano da express.json().
    const status = typeof error?.status === 'number' && error.status < 500 ? error.status : 500;
    console.error(`[server] ${status} ${error?.type ?? error?.name ?? 'unknown'}`);
    fail(res, status, status < 500 ? 'invalid-request' : 'ai-error');
  };
  app.use(handleError);

  return app;
}

if (require.main === module) {
  const aiEnabled = !['false', '0', 'no', 'off'].includes((process.env['AI_ENABLED'] ?? 'true').trim().toLowerCase());
  const apiKey = process.env['ANTHROPIC_API_KEY']?.trim() || undefined;
  const port = Number(process.env['PORT'] ?? 3001);
  const orchestrator = createOrchestrator({ aiEnabled, apiKey });

  createApp(orchestrator).listen(port, () => {
    const mode = orchestrator.available ? 'AI attiva' : `AI non disponibile (${aiEnabled ? 'chiave mancante' : 'AI_ENABLED=false'})`;
    console.log(`[server] in ascolto su http://localhost:${port} — ${mode}`);
  });
}
