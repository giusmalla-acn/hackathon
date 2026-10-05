import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InvalidRequestError, validateAssistRequest } from './validate-request';

const field = {
  fieldId: 'email',
  label: 'Email',
  purpose: 'Serve per contattarti.',
  rules: ['Deve contenere la chiocciola'],
  step: 2,
  totalSteps: 3,
};

function invalid(body: unknown, path: string): void {
  assert.throws(() => validateAssistRequest(body), (error) => error instanceof InvalidRequestError && error.path === path);
}

describe('validateAssistRequest', () => {
  it('accetta explain e scarta le proprietà fuori contratto', () => {
    const request = validateAssistRequest({ skill: 'explain', field: { ...field, value: 'segreto' }, value: 'segreto' });
    assert.deepEqual(request, { skill: 'explain', field });
  });

  it('accetta error-hint con codici noti e style', () => {
    const request = validateAssistRequest({ skill: 'error-hint', style: 'simple', field, errorCodes: ['EMAIL_MISSING_AT'] });
    assert.deepEqual(request, { skill: 'error-hint', style: 'simple', field, errorCodes: ['EMAIL_MISSING_AT'] });
  });

  it('rifiuta richieste malformate', () => {
    invalid(null, 'body');
    invalid([], 'body');
    invalid({ skill: 'hack', field }, 'skill');
    invalid({ skill: 'explain' }, 'field');
    invalid({ skill: 'explain', field: { ...field, fieldId: 'phone' } }, 'field.fieldId');
    invalid({ skill: 'explain', field: { ...field, step: 4 } }, 'field.step');
    invalid({ skill: 'explain', field, style: 'loud' }, 'style');
    invalid({ skill: 'rephrase', field }, 'previousText');
    invalid({ skill: 'question', field, question: 'x'.repeat(501) }, 'question');
    invalid({ skill: 'error-hint', field, errorCodes: [] }, 'errorCodes');
    invalid({ skill: 'error-hint', field, errorCodes: ['WRONG'] }, 'errorCodes[0]');
  });
});
