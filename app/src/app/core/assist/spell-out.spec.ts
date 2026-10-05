import { spellOut } from './spell-out';

describe('spellOut', () => {
  it('spells the E2-6 example from the test script', () => {
    expect(spellOut('Anna_R-1@esempio.it')).toBe(
      'A maiuscola, n, n, a, trattino basso, R maiuscola, trattino, 1, chiocciola, ' +
        'e, s, e, m, p, i, o, punto, i, t',
    );
  });

  it('reads spaces and accented capitals', () => {
    expect(spellOut('È a')).toBe('È maiuscola, spazio, a');
  });

  it('names common password symbols', () => {
    expect(spellOut('a!#')).toBe('a, punto esclamativo, cancelletto');
  });

  it('returns an empty string for empty input', () => {
    expect(spellOut('')).toBe('');
  });
});
