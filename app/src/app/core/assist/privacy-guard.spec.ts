import type { AssistFieldContext, AssistRequest } from '../contracts';
import {
  AssistPrivacyError,
  REDACTED_EMAIL,
  REDACTED_SECRET,
  guardAssistRequest,
  redactSensitiveText,
} from './privacy-guard';

const field: AssistFieldContext = {
  fieldId: 'email',
  label: 'Email',
  purpose: 'Scrivi il tuo indirizzo email, poi premi Avanti.',
  rules: ['Deve contenere la chiocciola.'],
  step: 2,
  totalSteps: 3,
};

/** Simula un chiamante che aggira i tipi (es. spread del modello del form). */
function smuggle(request: object): AssistRequest {
  return request as AssistRequest;
}

describe('guardAssistRequest', () => {
  describe('payload in uscita senza valori', () => {
    it('throws when the request carries a "value" key', () => {
      const request = smuggle({ skill: 'explain', field, value: 'anna@esempio.it' });

      expect(() => guardAssistRequest(request)).toThrow(AssistPrivacyError);
    });

    it('throws when "value" is nested inside the field context', () => {
      const request = smuggle({ skill: 'explain', field: { ...field, value: 'Girasole42' } });

      expect(() => guardAssistRequest(request)).toThrow(AssistPrivacyError);
    });

    it('throws on "Value" and "values" too, at any depth', () => {
      expect(() =>
        guardAssistRequest(smuggle({ skill: 'explain', field, meta: [{ Value: 'x' }] })),
      ).toThrow(AssistPrivacyError);
      expect(() =>
        guardAssistRequest(smuggle({ skill: 'explain', field, values: { name: 'Anna' } })),
      ).toThrow(AssistPrivacyError);
    });

    it('never puts the value in the error message', () => {
      const request = smuggle({ skill: 'explain', field, value: 'Girasole42' });

      expect(() => guardAssistRequest(request)).toThrow(/request\.value/);
      expect(() => guardAssistRequest(request)).not.toThrow(/Girasole42/);
    });

    it('throws when errorCodes contain something that is not a code', () => {
      const request = smuggle({ skill: 'error-hint', field, errorCodes: ['REQUIRED', 'anna rossi'] });

      expect(() => guardAssistRequest(request)).toThrow(AssistPrivacyError);
      expect(() => guardAssistRequest(request)).not.toThrow(/anna rossi/);
    });

    it('throws on empty errorCodes and unknown skills', () => {
      expect(() => guardAssistRequest(smuggle({ skill: 'error-hint', field, errorCodes: [] }))).toThrow(
        AssistPrivacyError,
      );
      expect(() => guardAssistRequest(smuggle({ skill: 'dump', field }))).toThrow(AssistPrivacyError);
    });

    it('copies only contract keys, dropping anything else', () => {
      const request = smuggle({
        skill: 'error-hint',
        field: { ...field, input: 'anna@esempio.it', length: 15 },
        errorCodes: ['EMAIL_MISSING_AT'],
        attempt: 2,
        typed: 'anna',
      });

      expect(guardAssistRequest(request)).toEqual({
        skill: 'error-hint',
        field,
        errorCodes: ['EMAIL_MISSING_AT'],
      });
    });

    it('serializes to a payload with no value, email or password-like text', () => {
      const request: AssistRequest = {
        skill: 'question',
        field,
        question: 'ho scritto anna.rossi@esempio.it e la password Girasole42, va bene?',
      };

      const payload = JSON.stringify(guardAssistRequest(request));

      expect(payload).not.toMatch(/"value"/i);
      expect(payload).not.toContain('anna.rossi@esempio.it');
      expect(payload).not.toContain('Girasole42');
      expect(payload).not.toMatch(/\S@\S/);
    });

    it('keeps a valid style and drops an unknown one', () => {
      expect(guardAssistRequest({ skill: 'explain', field, style: 'simple' })).toEqual({
        skill: 'explain',
        field,
        style: 'simple',
      });
      expect(guardAssistRequest(smuggle({ skill: 'explain', field, style: 'Girasole42' }))).toEqual({
        skill: 'explain',
        field,
      });
    });
  });

  it('passes clean requests through unchanged', () => {
    const requests: AssistRequest[] = [
      { skill: 'explain', field },
      { skill: 'example', field },
      { skill: 'rephrase', field, previousText: 'Spiegazione 1 di 3: Scrivi la tua email.' },
      { skill: 'error-hint', field, errorCodes: ['EMAIL_MISSING_AT', 'EMAIL_INVALID_DOMAIN'] },
      { skill: 'question', field, question: "Cos'è la chiocciola?" },
    ];

    for (const request of requests) {
      expect(guardAssistRequest(request)).toEqual(request);
    }
  });

  it('redacts free text in rephrase and question', () => {
    expect(
      guardAssistRequest({ skill: 'rephrase', field, previousText: 'Esempio: anna@esempio.it.' }),
    ).toEqual({ skill: 'rephrase', field, previousText: `Esempio: ${REDACTED_EMAIL}` });
  });
});

describe('redactSensitiveText', () => {
  it.each([
    ['la mia email è anna.rossi@esempio.it', `la mia email è ${REDACTED_EMAIL}`],
    ['scrivo anna @ esempio.it giusto?', `scrivo ${REDACTED_EMAIL} giusto?`],
    ['la password è Girasole42.', `la password è ${REDACTED_SECRET}`],
    ['va bene ciao$mondo?', `va bene ${REDACTED_SECRET}`],
    ['il pin è 123456', `il pin è ${REDACTED_SECRET}`],
  ])('redacts %p', (input, expected) => {
    expect(redactSensitiveText(input)).toBe(expected);
  });

  it.each([
    'Passo 2 di 3: Email.',
    "Puoi usare lettere accentate, apostrofo e trattino, come in D'Angelo o Anna-Maria.",
    'Dopo la chiocciola serve un dominio con un punto, per esempio esempio punto it.',
    'Spiegazione 1 di 3: perché ci serve?',
    'Almeno 8 caratteri.',
  ])('leaves ordinary text alone: %p', (text) => {
    expect(redactSensitiveText(text)).toBe(text);
  });

  it('does not re-redact its own markers', () => {
    const once = redactSensitiveText('anna@esempio.it Girasole42');

    expect(redactSensitiveText(once)).toBe(once);
  });
});
