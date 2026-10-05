import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { AssistRequest, AssistResponse } from '../contracts';
import { AssistOrchestrator } from './assist-orchestrator.service';
import { AI_ASSIST_PROVIDER } from './assist-provider';
import { HttpAssistProvider } from './http-assist.provider';
import { provideAssist } from './provide-assist';
import { TEST_FIELDS } from './testing/assist-test-fields';

const ENDPOINT = '/api/assist';

const request: AssistRequest = {
  skill: 'error-hint',
  field: {
    fieldId: 'email',
    label: 'Email',
    purpose: 'Scrivi il tuo indirizzo email, poi premi Avanti.',
    rules: ['Deve contenere la chiocciola.'],
    step: 2,
    totalSteps: 3,
  },
  errorCodes: ['EMAIL_MISSING_AT'],
};

describe('HttpAssistProvider (via provideAssist)', () => {
  let http: HttpTestingController;
  let orchestrator: AssistOrchestrator;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAssist(TEST_FIELDS, { endpoint: ENDPOINT }),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    orchestrator = TestBed.inject(AssistOrchestrator);
  });

  afterEach(() => http.verify());

  it('is registered as the AI provider when an endpoint is given', () => {
    expect(TestBed.inject(AI_ASSIST_PROVIDER)).toBeInstanceOf(HttpAssistProvider);
  });

  it('POSTs only the guarded request', () => {
    orchestrator.assist(request).subscribe();

    const call = http.expectOne(ENDPOINT);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    expect(JSON.stringify(call.request.body)).not.toMatch(/"value"/i);
    call.flush({ text: 'Manca la chiocciola.' });
  });

  it('maps a valid body to an AI response', () => {
    const out: AssistResponse[] = [];
    orchestrator.assist(request).subscribe((response) => out.push(response));

    http.expectOne(ENDPOINT).flush({ text: 'Manca la chiocciola.', intent: 'answer' });

    expect(out).toEqual([{ text: 'Manca la chiocciola.', source: 'ai', intent: 'answer' }]);
  });

  it('drops an unknown intent', () => {
    const out: AssistResponse[] = [];
    orchestrator.assist(request).subscribe((response) => out.push(response));

    http.expectOne(ENDPOINT).flush({ text: 'Manca la chiocciola.', intent: 'delete-account' });

    expect(out).toEqual([{ text: 'Manca la chiocciola.', source: 'ai' }]);
  });

  it.each([
    ['a body without text', { answer: 'ciao' }],
    ['a non-object body', 'ciao'],
  ])('falls back on %s', (_label, body) => {
    const out: AssistResponse[] = [];
    orchestrator.assist(request).subscribe((response) => out.push(response));

    http.expectOne(ENDPOINT).flush(body);

    expect(out[0].source).toBe('fallback');
  });

  it('falls back on HTTP errors', () => {
    const out: AssistResponse[] = [];
    orchestrator.assist(request).subscribe((response) => out.push(response));

    http.expectOne(ENDPOINT).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(out).toEqual([
      {
        text: "Errore nel campo Email: manca la chiocciola. Un'email ha la forma nome chiocciola dominio, per esempio anna punto rossi chiocciola esempio punto it.",
        source: 'fallback',
      },
    ]);
  });
});

describe('provideAssist without endpoint', () => {
  it('registers no AI provider and keeps AI disabled', () => {
    TestBed.configureTestingModule({ providers: [provideAssist(TEST_FIELDS)] });

    expect(TestBed.inject(AI_ASSIST_PROVIDER, null)).toBeNull();
    expect(TestBed.inject(AssistOrchestrator)).toBeInstanceOf(AssistOrchestrator);
  });
});
