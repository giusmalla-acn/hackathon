import type { FieldDefinition } from '../../contracts';

/**
 * Campi di prova per i test di assist, allineati a docs/a11y-test-script.md.
 * La password non definisce tutti i messaggi d'errore, per esercitare quelli generici.
 */
export const TEST_FIELDS: readonly FieldDefinition[] = [
  {
    id: 'name',
    label: 'Nome',
    inputType: 'text',
    autocomplete: 'name',
    purpose: 'Scrivi il tuo nome, poi premi Avanti.',
    why: 'Ci serve per sapere come chiamarti.',
    example: 'Anna Rossi',
    rules: ['Almeno 2 lettere.'],
    alternativeExplanations: [
      'Scrivi come ti chiami.',
      'In questo campo va il nome con cui vuoi essere chiamato.',
      'Scrivi il tuo nome. Per esempio: Anna.',
    ],
    errorMessages: {
      REQUIRED: 'il nome è vuoto. Scrivi il tuo nome, poi premi Avanti.',
      NAME_TOO_SHORT: 'il nome deve avere almeno 2 lettere.',
    },
  },
  {
    id: 'email',
    label: 'Email',
    inputType: 'email',
    autocomplete: 'email',
    purpose: 'Scrivi il tuo indirizzo email, poi premi Avanti.',
    why: 'Ci serve per inviarti la conferma.',
    example: 'anna.rossi@esempio.it',
    rules: ['Deve contenere la chiocciola.'],
    alternativeExplanations: [
      "Scrivi l'indirizzo dove ricevi la posta elettronica.",
      'Un indirizzo email ha tre parti: nome utente, chiocciola e dominio.',
      'Scrivi la tua email, con la chiocciola in mezzo.',
    ],
    errorMessages: {
      EMAIL_MISSING_AT:
        "manca la chiocciola. Un'email ha la forma nome chiocciola dominio, per esempio anna punto rossi chiocciola esempio punto it.",
    },
  },
  {
    id: 'password',
    label: 'Password',
    inputType: 'password',
    autocomplete: 'new-password',
    purpose: 'Scegli una password di almeno 8 caratteri, con almeno una lettera e un numero.',
    why: 'Protegge il tuo account.',
    example: 'Girasole42',
    rules: ['Almeno 8 caratteri.', 'Almeno una lettera.', 'Almeno un numero.'],
    alternativeExplanations: [
      'Inventa una parola segreta di almeno 8 caratteri.',
      'La password è la chiave del tuo account.',
      'Scegli una parola segreta con lettere e numeri.',
    ],
    errorMessages: {
      PASSWORD_TOO_SHORT: 'la password è troppo corta: ne servono almeno 8 caratteri.',
      PASSWORD_MISSING_DIGIT: 'la password è debole: aggiungi un numero.',
    },
  },
];

export function testField(id: FieldDefinition['id']): FieldDefinition {
  const field = TEST_FIELDS.find((candidate) => candidate.id === id);
  if (!field) {
    throw new Error(`Campo di prova sconosciuto: ${id}`);
  }
  return field;
}
