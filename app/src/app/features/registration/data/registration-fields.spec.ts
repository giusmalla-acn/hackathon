import type { ValidationErrorCode } from '../../../core/contracts';
import { FIELD_VALIDATORS } from '../domain/validators';
import { getFieldDefinition, REGISTRATION_FIELDS } from './registration-fields';

/** Valori che fanno emettere al validatore di ciascun campo tutti i codici possibili. */
const ERROR_SAMPLES: Readonly<Record<string, readonly string[]>> = {
  name: ['', 'A', 'Anna2'],
  email: ['', 'anna', '@esempio.it', 'anna@esempio'],
  password: ['', 'abc', '12345678'],
};

describe('REGISTRATION_FIELDS', () => {
  it('defines name, email and password in step order', () => {
    expect(REGISTRATION_FIELDS.map((f) => f.id)).toEqual(['name', 'email', 'password']);
  });

  it.each(REGISTRATION_FIELDS.map((f) => [f.id, f] as const))(
    '%s has every text filled in, rules and at least 2 distinct alternative explanations',
    (_id, field) => {
      for (const text of [field.label, field.purpose, field.why, field.example]) {
        expect(text.trim()).not.toBe('');
      }
      expect(field.rules.length).toBeGreaterThan(0);
      expect(field.alternativeExplanations.length).toBeGreaterThanOrEqual(2);
      expect(new Set(field.alternativeExplanations).size).toBe(field.alternativeExplanations.length);
    },
  );

  it.each(REGISTRATION_FIELDS.map((f) => [f.id, f] as const))(
    '%s has a message for every code its validator can return',
    (id, field) => {
      const codes = new Set<ValidationErrorCode>(
        ERROR_SAMPLES[id].flatMap((value) => FIELD_VALIDATORS[id](value).errors),
      );
      expect(codes.size).toBeGreaterThan(0);
      for (const code of codes) {
        expect(field.errorMessages[code]?.trim()).toBeTruthy();
      }
    },
  );

  it('uses examples that pass validation', () => {
    for (const field of REGISTRATION_FIELDS) {
      expect(FIELD_VALIDATORS[field.id](field.example).valid).toBe(true);
    }
  });

  it('getFieldDefinition returns the field by id', () => {
    expect(getFieldDefinition('email').label).toBe('Email');
  });
});
