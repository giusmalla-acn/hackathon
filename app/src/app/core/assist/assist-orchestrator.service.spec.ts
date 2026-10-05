import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EMPTY, NEVER, type Observable, of, throwError } from 'rxjs';

import type { AssistFieldContext, AssistRequest, AssistResponse } from '../contracts';
import { AssistOrchestrator } from './assist-orchestrator.service';
import { AI_ASSIST_PROVIDER, type AssistProvider } from './assist-provider';
import { FallbackAssistProvider } from './fallback-assist.provider';
import { REDACTED_EMAIL } from './privacy-guard';
import { type AssistOptions, provideAssist } from './provide-assist';
import { TEST_FIELDS } from './testing/assist-test-fields';

const field: AssistFieldContext = {
  fieldId: 'name',
  label: 'Nome',
  purpose: 'Scrivi il tuo nome, poi premi Avanti.',
  rules: ['Almeno 2 lettere.'],
  step: 1,
  totalSteps: 3,
};

const explain: AssistRequest = { skill: 'explain', field };

class FakeAiProvider implements AssistProvider {
  readonly assist = jest.fn<Observable<AssistResponse>, [AssistRequest]>(() =>
    of({ text: 'Scrivi come ti chiamano gli amici.', source: 'ai' }),
  );
}

describe('AssistOrchestrator', () => {
  let ai: FakeAiProvider;

  function setup(options: AssistOptions = { aiEnabled: true }, withAi = true): AssistOrchestrator {
    ai = new FakeAiProvider();
    TestBed.configureTestingModule({
      providers: [
        provideAssist(TEST_FIELDS, options),
        withAi ? [{ provide: AI_ASSIST_PROVIDER, useValue: ai }] : [],
      ],
    });
    return TestBed.inject(AssistOrchestrator);
  }

  function collect(source: Observable<AssistResponse>): AssistResponse[] {
    const out: AssistResponse[] = [];
    source.subscribe({ next: (response) => out.push(response) });
    return out;
  }

  it('returns the AI answer when AI is available and enabled', () => {
    const orchestrator = setup();

    expect(collect(orchestrator.assist(explain))).toEqual([
      { text: 'Scrivi come ti chiamano gli amici.', source: 'ai' },
    ]);
  });

  it('keeps the intent and the source reported by the provider', () => {
    const orchestrator = setup();
    ai.assist.mockReturnValue(
      of({ text: 'Torno indietro.', source: 'fallback', intent: 'previous-field' }),
    );

    expect(collect(orchestrator.assist(explain))).toEqual([
      { text: 'Torno indietro.', source: 'fallback', intent: 'previous-field' },
    ]);
  });

  describe('privacy-guard before sending', () => {
    it('sends the sanitized request, never the raw text', () => {
      const orchestrator = setup();

      collect(
        orchestrator.assist({ skill: 'question', field, question: 'va bene anna@esempio.it?' }),
      );

      expect(ai.assist).toHaveBeenCalledWith({
        skill: 'question',
        field,
        question: `va bene ${REDACTED_EMAIL}`,
      });
    });

    it('does not call the AI when the request carries a value, and answers locally', () => {
      const orchestrator = setup();
      const leaky = { ...explain, value: 'Anna' } as AssistRequest;

      const [response] = collect(orchestrator.assist(leaky));

      expect(ai.assist).not.toHaveBeenCalled();
      expect(response.source).toBe('fallback');
      expect(response.text).not.toBe('');
    });
  });

  describe('fallback', () => {
    it('is used when aiEnabled is false', () => {
      const orchestrator = setup({ aiEnabled: false });

      const [response] = collect(orchestrator.assist(explain));

      expect(ai.assist).not.toHaveBeenCalled();
      expect(response.source).toBe('fallback');
    });

    it('is used when no AI provider is registered', () => {
      const orchestrator = setup({ aiEnabled: true }, false);

      expect(collect(orchestrator.assist(explain))[0].source).toBe('fallback');
    });

    it('is used when the AI fails, without erroring', () => {
      const orchestrator = setup();
      ai.assist.mockReturnValue(throwError(() => new Error('503')));
      const errors: unknown[] = [];

      const out: AssistResponse[] = [];
      orchestrator.assist(explain).subscribe({ next: (r) => out.push(r), error: (e) => errors.push(e) });

      expect(errors).toEqual([]);
      expect(out).toEqual([TestBed.inject(FallbackAssistProvider).respond(explain)]);
    });

    it('is used when the AI completes without answering', () => {
      const orchestrator = setup();
      ai.assist.mockReturnValue(EMPTY);

      expect(collect(orchestrator.assist(explain))[0].source).toBe('fallback');
    });

    it('is used after the 4 s timeout, not before', fakeAsync(() => {
      const orchestrator = setup();
      ai.assist.mockReturnValue(NEVER);

      const out = collect(orchestrator.assist(explain));
      tick(3999);
      expect(out).toEqual([]);

      tick(1);
      expect(out).toHaveLength(1);
      expect(out[0].source).toBe('fallback');
    }));

    it('honours a custom timeout', fakeAsync(() => {
      const orchestrator = setup({ aiEnabled: true, timeoutMs: 1000 });
      ai.assist.mockReturnValue(NEVER);

      const out = collect(orchestrator.assist(explain));
      tick(1000);

      expect(out[0].source).toBe('fallback');
    }));

    it.each([
      ['empty', '   '],
      ['with a URL', 'Vai su https://esempio.it'],
      ['with an email', 'Scrivi a anna@esempio.it'],
      ['too long', 'a'.repeat(301)],
    ])('is used when output-guard rejects an AI answer %s', (_label, text) => {
      const orchestrator = setup();
      ai.assist.mockReturnValue(of({ text, source: 'ai' }));

      expect(collect(orchestrator.assist(explain))[0].source).toBe('fallback');
    });

    it('rotates explanations locally when the AI is down', () => {
      const orchestrator = setup();
      ai.assist.mockReturnValue(throwError(() => new Error('down')));
      const request: AssistRequest = { skill: 'rephrase', field, previousText: field.purpose };

      const texts = [1, 2, 3].map(() => collect(orchestrator.assist(request))[0].text);

      expect(texts.map((text) => text.slice(0, 18))).toEqual([
        'Spiegazione 1 di 3',
        'Spiegazione 2 di 3',
        'Spiegazione 3 di 3',
      ]);
    });
  });

  it('normalizes the AI text through output-guard', () => {
    const orchestrator = setup();
    ai.assist.mockReturnValue(of({ text: '  Scrivi\n il nome. ', source: 'ai' }));

    expect(collect(orchestrator.assist(explain))[0].text).toBe('Scrivi il nome.');
  });
});
