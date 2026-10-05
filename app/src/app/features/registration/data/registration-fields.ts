import type { FieldDefinition, FieldId } from '../../../core/contracts';

/**
 * Campi del percorso guidato, nell'ordine dei passi.
 *
 * Testi da docs/a11y-test-script.md. I messaggi d'errore vengono annunciati dopo il prefisso
 * "Errore nel campo {label}: ", per questo iniziano in minuscolo.
 * Le spiegazioni alternative seguono gli stili brief → detailed → simple.
 */
export const REGISTRATION_FIELDS: readonly FieldDefinition[] = [
  {
    id: 'name',
    label: 'Nome',
    inputType: 'text',
    autocomplete: 'name',
    purpose: 'Scrivi il tuo nome, poi premi Avanti.',
    why: 'Ci serve per sapere come chiamarti e per intestare il tuo account.',
    example: 'Anna Rossi',
    rules: [
      'Almeno 2 lettere.',
      'Puoi usare lettere, anche accentate, spazi, apostrofo e trattino.',
    ],
    alternativeExplanations: [
      'Scrivi come ti chiami.',
      'In questo campo va il nome con cui vuoi essere chiamato. Puoi scrivere solo il nome oppure nome e cognome, ad esempio Anna Rossi. Servono almeno 2 lettere; puoi usare lettere accentate, spazi, apostrofo e trattino, come in D\'Angelo o Anna-Maria. Numeri e simboli non sono ammessi.',
      'Scrivi il tuo nome. Per esempio: Anna. Poi premi Avanti.',
    ],
    errorMessages: {
      REQUIRED: 'il nome è vuoto. Scrivi il tuo nome, poi premi Avanti.',
      NAME_TOO_SHORT: 'il nome deve avere almeno 2 lettere.',
      NAME_INVALID_CHARS:
        'il nome contiene numeri o simboli. Usa solo lettere, spazi, apostrofo e trattino.',
    },
  },
  {
    id: 'email',
    label: 'Email',
    inputType: 'email',
    autocomplete: 'email',
    purpose: 'Scrivi il tuo indirizzo email, poi premi Avanti.',
    why: "Ci serve per inviarti la conferma della registrazione e per farti accedere all'account.",
    example: 'anna.rossi@esempio.it',
    rules: [
      'Deve contenere la chiocciola.',
      'Dopo la chiocciola serve un dominio con un punto, per esempio esempio punto it.',
      'Non può contenere spazi.',
    ],
    alternativeExplanations: [
      "Scrivi l'indirizzo dove ricevi la posta elettronica.",
      "Un indirizzo email ha tre parti: prima il tuo nome utente, poi la chiocciola, poi il dominio del servizio di posta con almeno un punto. Per esempio anna punto rossi chiocciola esempio punto it. Non deve contenere spazi.",
      "Scrivi la tua email. È l'indirizzo che usi per ricevere messaggi, con la chiocciola in mezzo.",
    ],
    errorMessages: {
      REQUIRED: "l'email è vuota. Scrivi il tuo indirizzo email, poi premi Avanti.",
      EMAIL_MISSING_AT:
        "manca la chiocciola. Un'email ha la forma nome chiocciola dominio, per esempio anna punto rossi chiocciola esempio punto it.",
      EMAIL_INVALID_DOMAIN:
        "l'email non è completa. Dopo la chiocciola serve un dominio con un punto, per esempio esempio punto it.",
      EMAIL_INVALID_FORMAT:
        "l'email non è scritta correttamente. Serve una sola chiocciola, con del testo prima e dopo, e nessuno spazio.",
    },
  },
  {
    id: 'password',
    label: 'Password',
    inputType: 'password',
    autocomplete: 'new-password',
    purpose:
      'Scegli una password di almeno 8 caratteri, con almeno una lettera e un numero. Non verrà letta ad alta voce senza la tua conferma. Poi premi Avanti.',
    why: 'Protegge il tuo account: solo chi la conosce può accedere.',
    example: 'Girasole42',
    rules: ['Almeno 8 caratteri.', 'Almeno una lettera.', 'Almeno un numero.'],
    alternativeExplanations: [
      'Inventa una parola segreta di almeno 8 caratteri, con lettere e numeri.',
      'La password è la chiave del tuo account. Deve avere almeno 8 caratteri e contenere almeno una lettera e almeno un numero. Scegline una facile da ricordare per te ma difficile da indovinare per gli altri, e non usarla su altri siti. Non verrà letta ad alta voce senza la tua conferma.',
      'Scegli una parola segreta. Mettici lettere e numeri, almeno 8 in tutto. Per esempio una parola e un numero attaccati.',
    ],
    errorMessages: {
      REQUIRED: 'la password è vuota. Scegli una password di almeno 8 caratteri.',
      PASSWORD_TOO_SHORT: 'la password è troppo corta: ne servono almeno 8 caratteri.',
      PASSWORD_MISSING_LOWER: 'la password è debole: aggiungi una lettera.',
      PASSWORD_MISSING_DIGIT: 'la password è debole: aggiungi un numero.',
    },
  },
];

export function getFieldDefinition(id: FieldId): FieldDefinition {
  const field = REGISTRATION_FIELDS.find((f) => f.id === id);
  if (!field) {
    throw new Error(`Campo sconosciuto: ${id}`);
  }
  return field;
}
