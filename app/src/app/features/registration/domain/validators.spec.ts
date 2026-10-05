import { validateEmail, validateName, validatePassword } from './validators';

describe('validateName', () => {
  it.each([
    ['Anna'],
    ['Anna Rossi'],
    ["D'Angelo"],
    ['D’Angelo'],
    ['Niccolò'],
    ['José Ñúñez'],
    ['Anna-Maria'],
    ['  Luca  '],
    ['Zoë'],
  ])('accepts %p', (value) => {
    expect(validateName(value)).toEqual({ valid: true, errors: [] });
  });

  it.each([[''], ['   '], ['\t\n']])('returns REQUIRED for empty or whitespace-only %p', (value) => {
    expect(validateName(value)).toEqual({ valid: false, errors: ['REQUIRED'] });
  });

  it('returns NAME_TOO_SHORT for a single letter, ignoring surrounding spaces', () => {
    expect(validateName(' A ')).toEqual({ valid: false, errors: ['NAME_TOO_SHORT'] });
  });

  it("does not count apostrophes, hyphens or spaces as letters", () => {
    expect(validateName("D'")).toEqual({ valid: false, errors: ['NAME_TOO_SHORT'] });
    expect(validateName('A - B').errors).toEqual([]);
  });

  it.each([['Anna2'], ['Anna@Rossi'], ['Anna_Rossi'], ['Anna.']])(
    'returns NAME_INVALID_CHARS for %p',
    (value) => {
      expect(validateName(value)).toEqual({ valid: false, errors: ['NAME_INVALID_CHARS'] });
    },
  );

  it('lists NAME_INVALID_CHARS before NAME_TOO_SHORT', () => {
    expect(validateName('J4').errors).toEqual(['NAME_INVALID_CHARS', 'NAME_TOO_SHORT']);
  });
});

describe('validateEmail', () => {
  it.each([['anna.rossi@esempio.it'], ['Anna_R-1@esempio.it'], ['  anna@esempio.it  '], ['a@b.co.uk']])(
    'accepts %p',
    (value) => {
      expect(validateEmail(value)).toEqual({ valid: true, errors: [] });
    },
  );

  it.each([[''], ['   ']])('returns REQUIRED for %p', (value) => {
    expect(validateEmail(value)).toEqual({ valid: false, errors: ['REQUIRED'] });
  });

  it('returns EMAIL_MISSING_AT when there is no @ (spec E2-2)', () => {
    expect(validateEmail('anna.rossi.esempio.it')).toEqual({ valid: false, errors: ['EMAIL_MISSING_AT'] });
  });

  it.each([['@esempio.it'], ['anna@@esempio.it'], ['anna@ros@esempio.it'], ['anna rossi@esempio.it']])(
    'returns EMAIL_INVALID_FORMAT for %p',
    (value) => {
      expect(validateEmail(value)).toEqual({ valid: false, errors: ['EMAIL_INVALID_FORMAT'] });
    },
  );

  it.each([['anna@'], ['anna@esempio'], ['anna@esempio.'], ['anna@.it'], ['anna@esempio..it'], ['anna@-esempio.it']])(
    'returns EMAIL_INVALID_DOMAIN for %p',
    (value) => {
      expect(validateEmail(value)).toEqual({ valid: false, errors: ['EMAIL_INVALID_DOMAIN'] });
    },
  );
});

describe('validatePassword', () => {
  it.each([['Girasole42'], ['abcdefg1'], ['12345678a'], ['più lunga 9'], ['ÀÈÌÒÙ1234']])('accepts %p', (value) => {
    expect(validatePassword(value)).toEqual({ valid: true, errors: [] });
  });

  it('returns REQUIRED when empty', () => {
    expect(validatePassword('')).toEqual({ valid: false, errors: ['REQUIRED'] });
  });

  it('does not trim: eight spaces are not empty but still weak', () => {
    expect(validatePassword('        ').errors).toEqual(['PASSWORD_MISSING_LOWER', 'PASSWORD_MISSING_DIGIT']);
  });

  it('reports PASSWORD_TOO_SHORT first for a short weak password (spec E2-3a)', () => {
    expect(validatePassword('abc')).toEqual({
      valid: false,
      errors: ['PASSWORD_TOO_SHORT', 'PASSWORD_MISSING_DIGIT'],
    });
  });

  it('reports only the missing digit for eight letters (spec E2-3b)', () => {
    expect(validatePassword('abcdefgh')).toEqual({ valid: false, errors: ['PASSWORD_MISSING_DIGIT'] });
  });

  it('reports the missing letter for digits only', () => {
    expect(validatePassword('12345678')).toEqual({ valid: false, errors: ['PASSWORD_MISSING_LOWER'] });
  });

  it('returns only TOO_SHORT when letters and digits are present but length is 7', () => {
    expect(validatePassword('abcdef1')).toEqual({ valid: false, errors: ['PASSWORD_TOO_SHORT'] });
  });

  it('counts code points, not UTF-16 units, for the length', () => {
    expect(validatePassword('😀😀😀😀a1').errors).toEqual(['PASSWORD_TOO_SHORT']);
  });
});
