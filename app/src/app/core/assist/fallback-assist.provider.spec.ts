import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import type {
  AssistFieldContext,
  AssistRequest,
  FieldDefinition,
  FieldId,
  ValidationErrorCode,
} from '../contracts';
import { ASSIST_FALLBACK_FIELDS } from './assist-provider';
import { GENERIC_ERROR_MESSAGES, NO_MORE_EXPLANATIONS } from './assist-texts';
import { FallbackAssistProvider } from './fallback-assist.provider';
import { TEST_FIELDS, testField } from './testing/assist-test-fields';

const ALL_ERROR_CODES = Object.keys(GENERIC_ERROR_MESSAGES) as ValidationErrorCode[];

function contextOf(field: FieldDefinition, step = 1): AssistFieldContext {
  return {
    fieldId: field.id,
    label: field.label,
    purpose: field.purpose,
    rules: field.rules,
    step,
    totalSteps: 3,
  };
}

function rephrase(id: FieldId, previousText = ''): AssistRequest {
  return { skill: 'rephrase', field: contextOf(testField(id)), previousText };
}

describe('FallbackAssistProvider', () => {
  let provider: FallbackAssistProvider;

  function setup(fields: readonly FieldDefinition[] = TEST_FIELDS): void {
    TestBed.configureTestingModule({
      providers: [{ provide: ASSIST_FALLBACK_FIELDS, useValue: fields }, FallbackAssistProvider],
    });
    provider = TestBed.inject(FallbackAssistProvider);
  }

  beforeEach(() => setup());

  it('answers through an Observable with source "fallback"', async () => {
    const response = await firstValueFrom(
      provider.assist({ skill: 'explain', field: contextOf(testField('name')) }),
    );

    expect(response.source).toBe('fallback');
    expect(response.text).not.toBe('');
  });

  describe('rephrase: rotazione senza ripetizioni', () => {
    it('walks the alternative explanations in order, numbered "k di n"', () => {
      const texts = [1, 2, 3].map(() => provider.respond(rephrase('name')).text);

      expect(texts).toEqual([
        'Spiegazione 1 di 3: Scrivi come ti chiami.',
        'Spiegazione 2 di 3: In questo campo va il nome con cui vuoi essere chiamato.',
        'Spiegazione 3 di 3: Scrivi il tuo nome. Per esempio: Anna.',
      ]);
    });

    it('never repeats an explanation in the same session, then says there are no more', () => {
      const texts = Array.from({ length: 6 }, () => provider.respond(rephrase('email')).text);
      const explanations = texts.filter((text) => text !== NO_MORE_EXPLANATIONS);

      expect(explanations).toHaveLength(3);
      expect(new Set(explanations).size).toBe(3);
      expect(texts.slice(3)).toEqual([NO_MORE_EXPLANATIONS, NO_MORE_EXPLANATIONS, NO_MORE_EXPLANATIONS]);
    });

    it('keeps a separate rotation for each field', () => {
      provider.respond(rephrase('name'));
      provider.respond(rephrase('name'));

      expect(provider.respond(rephrase('email')).text).toMatch(/^Spiegazione 1 di 3:/);
      expect(provider.respond(rephrase('name')).text).toMatch(/^Spiegazione 3 di 3:/);
    });

    it('skips an explanation equal to the text just spoken', () => {
      const response = provider.respond(rephrase('name', '  scrivi come TI chiami. '));

      expect(response.text).toBe(
        'Spiegazione 2 di 3: In questo campo va il nome con cui vuoi essere chiamato.',
      );
    });

    it('starts over in a new session (new provider instance)', () => {
      provider.respond(rephrase('name'));
      TestBed.resetTestingModule();
      setup();

      expect(provider.respond(rephrase('name')).text).toMatch(/^Spiegazione 1 di 3:/);
    });

    it('skips blank explanations and never returns empty text', () => {
      TestBed.resetTestingModule();
      setup([{ ...testField('name'), alternativeExplanations: ['  ', 'Unica spiegazione.'] }]);

      expect(provider.respond(rephrase('name')).text).toBe('Spiegazione 1 di 1: Unica spiegazione.');
      expect(provider.respond(rephrase('name')).text).toBe(NO_MORE_EXPLANATIONS);
    });
  });

  describe('explain and example use the static texts', () => {
    it('explain = purpose, why and rules', () => {
      const field = testField('password');

      expect(provider.respond({ skill: 'explain', field: contextOf(field) }).text).toBe(
        'Scegli una password di almeno 8 caratteri, con almeno una lettera e un numero. ' +
          'Protegge il tuo account. Almeno 8 caratteri. Almeno una lettera. Almeno un numero.',
      );
    });

    it('example follows the script wording', () => {
      expect(provider.respond({ skill: 'example', field: contextOf(testField('email')) }).text).toBe(
        'Esempio: anna.rossi@esempio.it. È solo un esempio, il campo non è stato modificato.',
      );
    });
  });

  describe('error-hint: ogni codice di errore restituisce testo', () => {
    it.each(TEST_FIELDS.flatMap((field) => ALL_ERROR_CODES.map((code) => [field.id, code] as const)))(
      '%s / %s',
      (fieldId, code) => {
        const field = testField(fieldId);
        const { text } = provider.respond({
          skill: 'error-hint',
          field: contextOf(field),
          errorCodes: [code],
        });

        expect(text).toMatch(new RegExp(`^Errore nel campo ${field.label}: \\S`));
        expect(text).toContain(field.errorMessages[code] ?? GENERIC_ERROR_MESSAGES[code]);
      },
    );

    it('uses the first code, which has the highest priority', () => {
      const { text } = provider.respond({
        skill: 'error-hint',
        field: contextOf(testField('password')),
        errorCodes: ['PASSWORD_MISSING_DIGIT', 'PASSWORD_TOO_SHORT'],
      });

      expect(text).toBe('Errore nel campo Password: la password è debole: aggiungi un numero.');
    });

    it('still answers for a code outside the contract', () => {
      const { text } = provider.respond({
        skill: 'error-hint',
        field: contextOf(testField('name')),
        errorCodes: ['FUTURE_CODE' as ValidationErrorCode],
      });

      expect(text).toMatch(/^Errore nel campo Nome: \S/);
    });
  });

  describe('question (keyword intents)', () => {
    it.each([
      ['puoi ripetere? ripeti', 'repeat'],
      ['fammi un esempio', 'example'],
      ['non ho capito', 'rephrase'],
      ['perché mi serve?', 'explain'],
      ['torna indietro', 'previous-field'],
      ['vai avanti', 'next-field'],
      ['basta così', 'stop'],
      ['che tempo fa?', 'unknown'],
    ] as const)('%p → %s', (question, intent) => {
      const response = provider.respond({
        skill: 'question',
        field: contextOf(testField('name')),
        question,
      });

      expect(response.intent).toBe(intent);
      expect(response.text.trim()).not.toBe('');
    });
  });

  describe('mai testo vuoto', () => {
    const skills = (field: FieldDefinition): AssistRequest[] => [
      { skill: 'explain', field: contextOf(field) },
      { skill: 'example', field: contextOf(field) },
      { skill: 'rephrase', field: contextOf(field), previousText: '' },
      { skill: 'error-hint', field: contextOf(field), errorCodes: ['REQUIRED'] },
      { skill: 'question', field: contextOf(field), question: '' },
    ];

    it('for every skill on every field', () => {
      for (const field of TEST_FIELDS) {
        for (const request of skills(field)) {
          expect(provider.respond(request).text.trim()).not.toBe('');
        }
      }
    });

    it('even when the field has no static texts at all', () => {
      const empty: FieldDefinition = {
        ...testField('name'),
        purpose: '',
        why: '',
        example: '',
        rules: [],
        alternativeExplanations: [],
        errorMessages: {},
      };
      TestBed.resetTestingModule();
      setup([empty]);

      for (const request of skills(empty)) {
        expect(provider.respond(request).text.trim()).not.toBe('');
      }
    });

    it('even for a field the fallback does not know', () => {
      TestBed.resetTestingModule();
      setup([]);

      for (const request of skills(testField('email'))) {
        expect(provider.respond(request).text.trim()).not.toBe('');
      }
    });
  });
});
