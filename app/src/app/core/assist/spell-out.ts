/** Come si legge ogni simbolo nella rilettura lettera per lettera (docs/a11y-test-script.md §2.1). */
const SYMBOL_NAMES: Readonly<Record<string, string>> = {
  '@': 'chiocciola',
  '.': 'punto',
  '-': 'trattino',
  _: 'trattino basso',
  ',': 'virgola',
  ';': 'punto e virgola',
  ':': 'due punti',
  "'": 'apostrofo',
  '’': 'apostrofo',
  '!': 'punto esclamativo',
  '?': 'punto interrogativo',
  '+': 'più',
  '=': 'uguale',
  '*': 'asterisco',
  '/': 'barra',
  '\\': 'barra rovesciata',
  '#': 'cancelletto',
  $: 'dollaro',
  '€': 'euro',
  '%': 'percento',
  '&': 'e commerciale',
  '(': 'parentesi aperta',
  ')': 'parentesi chiusa',
  '"': 'virgolette',
};

/**
 * Rilettura locale carattere per carattere, separata da virgole: "A maiuscola, n, chiocciola".
 * Resta nel browser: non va mai inviata all'AI.
 */
export function spellOut(text: string): string {
  return Array.from(text).map(spellCharacter).join(', ');
}

function spellCharacter(char: string): string {
  const name = SYMBOL_NAMES[char];
  if (name) {
    return name;
  }
  if (/\s/u.test(char)) {
    return 'spazio';
  }
  const isUpper = char !== char.toLocaleLowerCase('it') && char === char.toLocaleUpperCase('it');
  return isUpper ? `${char} maiuscola` : char;
}
