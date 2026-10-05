import type { FieldDefinition, ValidationErrorCode } from '../contracts';

/**
 * Testi locali di riserva, usati quando un campo non definisce il proprio messaggio.
 * `Record` esaustivo: un nuovo codice nel contratto non compila finché non ha un testo.
 * Iniziano in minuscolo perché seguono il prefisso "Errore nel campo {etichetta}: ".
 */
export const GENERIC_ERROR_MESSAGES: Readonly<Record<ValidationErrorCode, string>> = {
  REQUIRED: 'il campo è vuoto. Scrivi un valore, poi premi Avanti.',
  NAME_TOO_SHORT: 'il nome è troppo corto.',
  NAME_INVALID_CHARS: 'il nome contiene caratteri non ammessi. Usa solo lettere, spazi, apostrofo e trattino.',
  EMAIL_MISSING_AT: "manca la chiocciola. Un'email ha la forma nome chiocciola dominio.",
  EMAIL_INVALID_DOMAIN: "l'email non è completa. Dopo la chiocciola serve un dominio con un punto.",
  EMAIL_INVALID_FORMAT: "l'email non è scritta correttamente.",
  PASSWORD_TOO_SHORT: 'la password è troppo corta.',
  PASSWORD_MISSING_UPPER: 'la password è debole: aggiungi una lettera maiuscola.',
  PASSWORD_MISSING_LOWER: 'la password è debole: aggiungi una lettera minuscola.',
  PASSWORD_MISSING_DIGIT: 'la password è debole: aggiungi un numero.',
  PASSWORD_MISSING_SYMBOL: 'la password è debole: aggiungi un simbolo.',
};

const UNKNOWN_ERROR_MESSAGE = 'il dato inserito non è valido. Premi Spiega in altro modo per sentire le regole.';

export const NO_MORE_EXPLANATIONS =
  'Non ho altre spiegazioni. Premi Esempio per sentirne uno, oppure Ripeti.';

/** Messaggio del campo per il codice; se manca, quello generico. Mai vuoto. */
export function errorMessageFor(field: FieldDefinition | undefined, code: ValidationErrorCode): string {
  const own = field?.errorMessages[code]?.trim();
  if (own) {
    return own;
  }
  // Il codice può arrivare da fuori dal tipo (es. dal backend): niente indicizzazione cieca.
  return Object.hasOwn(GENERIC_ERROR_MESSAGES, code) ? GENERIC_ERROR_MESSAGES[code] : UNKNOWN_ERROR_MESSAGE;
}

export function errorAnnouncement(label: string, message: string): string {
  return `Errore nel campo ${label}: ${message}`;
}

/** Unisce frasi saltando quelle vuote. */
export function joinSentences(...parts: readonly (string | undefined)[]): string {
  return parts
    .map((part) => part?.trim() ?? '')
    .filter((part) => part !== '')
    .join(' ');
}
