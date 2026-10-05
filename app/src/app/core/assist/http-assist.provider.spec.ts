import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import type { Observable } from 'rxjs';

import type { AssistRequest, AssistResponse } from '../contracts';
import { AssistOrchestrator } from './assist-orchestrator.service';
import { AI_ASSIST_PROVIDER, type AssistProvider } from './assist-provider';
import { FallbackAssistProvider } from './fallback-assist.provider';
import { HttpAssistProvider } from './http-assist.provider';
import { AssistPrivacyError, REDACTED_EMAIL } from './privacy-guard';
import { DEFAULT_ASSIST_ENDPOINT, provideAssist } from './provide-assist';
import { TEST_FIELDS } from './testing/assist-test-fields';

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

const STATIC_HINT =
  "Errore nel campo Email: manca la chiocciola. Un'email ha la forma nome chiocciola dominio, per esempio anna punto rossi chiocciola esempio punto it.";

function collect(source: Observable<AssistResponse>): AssistResponse[] {
  const out: AssistResponse[] = [];
  source.subscribe((response) => out.push(response));
  return out;
}

describe('HttpAssistProvider (provideAssist("ai"))', () => {
  let http: HttpTestingController;
  let provider: AssistProvider;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAssist('ai', { fallback: TEST_FIELDS }),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    provider = TestBed.inject(AI_ASSIST_PROVIDER);
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    http.verify();
    warn.mockRestore();
  });

  it('registers the HTTP provider on /api/assist', () => {
    expect(provider).toBeInstanceOf(HttpAssistProvider);
    expect(DEFAULT_ASSIST_ENDPOINT).toBe('/api/assist');
  });

  describe('valid response', () => {
    it('uses the AI text', () => {
      const out = collect(provider.assist(request));

      const call = http.expectOne(DEFAULT_ASSIST_ENDPOINT);
      expect(call.request.method).toBe('POST');
      call.flush({ text: 'Manca la chiocciola.', source: 'ai', intent: 'answer' });

      expect(out).toEqual([{ text: 'Manca la chiocciola.', source: 'ai', intent: 'answer' }]);
      expect(warn).not.toHaveBeenCalled();
    });

    it('uses the AI text through the orchestrator too', () => {
      const out = collect(TestBed.inject(AssistOrchestrator).assist(request));

      http.expectOne(DEFAULT_ASSIST_ENDPOINT).flush({ text: '  Manca\n la chiocciola. ' });

      expect(out).toEqual([{ text: 'Manca la chiocciola.', source: 'ai' }]);
    });

    it('drops an unknown intent', () => {
      const out = collect(provider.assist(request));

      http.expectOne(DEFAULT_ASSIST_ENDPOINT).flush({ text: 'Ciao.', intent: 'delete-account' });

      expect(out).toEqual([{ text: 'Ciao.', source: 'ai' }]);
    });
  });

  describe('fallback', () => {
    it('uses the static text after the 4 s timeout, not before', fakeAsync(() => {
      const out = collect(provider.assist(request));
      const call = http.expectOne(DEFAULT_ASSIST_ENDPOINT);

      tick(3999);
      expect(out).toEqual([]);

      tick(1);
      expect(out).toEqual([{ text: STATIC_HINT, source: 'fallback' }]);
      expect(call.cancelled).toBe(true);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('timeout'));
    }));

    it('uses the static text on 503', () => {
      const out = collect(provider.assist(request));

      http
        .expectOne(DEFAULT_ASSIST_ENDPOINT)
        .flush({ error: 'ai-unavailable' }, { status: 503, statusText: 'Service Unavailable' });

      expect(out).toEqual([{ text: STATIC_HINT, source: 'fallback' }]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('HTTP 503'));
    });

    it('keeps the fallback source through the orchestrator', () => {
      const out = collect(TestBed.inject(AssistOrchestrator).assist(request));

      http.expectOne(DEFAULT_ASSIST_ENDPOINT).error(new ProgressEvent('error'));

      expect(out).toEqual([{ text: STATIC_HINT, source: 'fallback' }]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('rete'));
    });

    it.each([
      ['a URL', { text: 'Vai su https://esempio.it' }],
      ['an email', { text: 'Scrivi a anna@esempio.it' }],
      ['an empty text', { text: '   ' }],
    ])('uses the static text when output-guard rejects %s', (_label, body) => {
      const out = collect(provider.assist(request));

      http.expectOne(DEFAULT_ASSIST_ENDPOINT).flush(body);

      expect(out).toEqual([{ text: STATIC_HINT, source: 'fallback' }]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('output-guard'));
      expect(String(warn.mock.calls[0][0])).not.toContain('esempio');
    });

    it.each([
      ['a body without text', { answer: 'ciao' }],
      ['a non-object body', 'ciao'],
      ['an empty body', null],
    ])('uses the static text on %s', (_label, body) => {
      const out = collect(provider.assist(request));

      http.expectOne(DEFAULT_ASSIST_ENDPOINT).flush(body);

      expect(out[0].source).toBe('fallback');
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('privacy-guard', () => {
    it('sends a payload without values', () => {
      collect(provider.assist(request));

      const call = http.expectOne(DEFAULT_ASSIST_ENDPOINT);
      expect(call.request.body).toEqual(request);
      expect(JSON.stringify(call.request.body)).not.toMatch(/"values?"/i);
      call.flush({ text: 'Manca la chiocciola.' });
    });

    it('strips non-contract keys and redacts emails before sending', () => {
      const question = {
        skill: 'question',
        field: { ...request.field, hint: 'extra' },
        question: 'va bene anna@esempio.it?',
        password: 'Girasole42',
      } as AssistRequest;

      collect(provider.assist(question));

      const call = http.expectOne(DEFAULT_ASSIST_ENDPOINT);
      expect(call.request.body).toEqual({
        skill: 'question',
        field: request.field,
        question: `va bene ${REDACTED_EMAIL}`,
      });
      const sent = JSON.stringify(call.request.body);
      expect(sent).not.toContain('anna@esempio.it');
      expect(sent).not.toContain('Girasole42');
      call.flush({ text: 'Sì.' });
    });

    it.each([
      ['at the top level', { ...request, value: 'anna@esempio.it' }],
      ['inside the field', { ...request, field: { ...request.field, value: 'anna' } }],
    ])('throws and sends nothing when a value is %s', (_label, leaky) => {
      const fallback = jest.spyOn(TestBed.inject(FallbackAssistProvider), 'assist');

      expect(() => provider.assist(leaky as AssistRequest)).toThrow(AssistPrivacyError);

      http.expectNone(DEFAULT_ASSIST_ENDPOINT);
      expect(fallback).not.toHaveBeenCalled();
    });
  });
});

describe('provideAssist modes', () => {
  it('uses a custom endpoint with the legacy signature', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAssist(TEST_FIELDS, { endpoint: '/custom' }),
      ],
    });
    const http = TestBed.inject(HttpTestingController);

    collect(TestBed.inject(AssistOrchestrator).assist(request));

    http.expectOne('/custom').flush({ text: 'Ok.' });
    http.verify();
  });

  it.each([
    ['provideAssist("fallback")', () => provideAssist('fallback', { fallback: TEST_FIELDS })],
    ['provideAssist(fields)', () => provideAssist(TEST_FIELDS)],
  ])('%s registers no AI provider', (_label, providers) => {
    TestBed.configureTestingModule({ providers: [providers()] });

    expect(TestBed.inject(AI_ASSIST_PROVIDER, null)).toBeNull();
    expect(TestBed.inject(AssistOrchestrator)).toBeInstanceOf(AssistOrchestrator);
  });
});
