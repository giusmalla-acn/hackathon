import { ASSIST_OUTPUT_MAX_LENGTH, guardAssistOutput } from './output-guard';

describe('guardAssistOutput', () => {
  it('accepts plain Italian text', () => {
    const text = "L'email è l'indirizzo dove ricevi la posta: nome, chiocciola e dominio, per esempio esempio punto it.";

    expect(guardAssistOutput(text)).toBe(text);
  });

  it('trims and collapses whitespace, including new lines', () => {
    expect(guardAssistOutput('  Scrivi il tuo nome.\n\n\tPoi premi Avanti.  ')).toBe(
      'Scrivi il tuo nome. Poi premi Avanti.',
    );
  });

  it.each([
    ['empty', ''],
    ['blank', ' \n\t '],
    ['not a string', 42],
    ['null', null],
  ])('rejects %s output', (_label, text) => {
    expect(guardAssistOutput(text)).toBeNull();
  });

  it.each([
    ['a control character', 'Scrivi\u0007 il nome.'],
    ['a zero-width space', 'Scrivi​ il nome.'],
    ['a bidi override', 'Scrivi ‮il nome.'],
    ['a private-use character', 'Scrivi  il nome.'],
  ])('rejects %s', (_label, text) => {
    expect(guardAssistOutput(text)).toBeNull();
  });

  it.each([
    'Vai su https://esempio.it per sapere di più.',
    'Apri http://localhost:4200.',
    'Visita www.esempio.it oggi.',
    'Scrivi a esempio.com/aiuto per assistenza.',
    'Premi javascript:alert(1)',
    'Scrivi a mailto:aiuto',
  ])('rejects URLs: %p', (text) => {
    expect(guardAssistOutput(text)).toBeNull();
  });

  it.each(['Scrivi a anna.rossi@esempio.it.', 'Per esempio anna @ esempio.it'])(
    'rejects emails: %p',
    (text) => {
      expect(guardAssistOutput(text)).toBeNull();
    },
  );

  it(`accepts up to ${ASSIST_OUTPUT_MAX_LENGTH} characters and rejects longer text`, () => {
    const max = 'a'.repeat(ASSIST_OUTPUT_MAX_LENGTH);

    expect(guardAssistOutput(max)).toBe(max);
    expect(guardAssistOutput(`${max}b`)).toBeNull();
  });

  it('measures the length after normalization', () => {
    const padded = `   ${'a'.repeat(ASSIST_OUTPUT_MAX_LENGTH)}   `;

    expect(guardAssistOutput(padded)).toHaveLength(ASSIST_OUTPUT_MAX_LENGTH);
  });
});
