// CONGELATO dopo S0
/**
 * Esito della validazione di un campo.
 *
 * Privacy: i codici descrivono *perché* un valore non è valido, mai il valore stesso.
 * Sono gli unici dati di validazione che possono essere inviati all'AI.
 */
export type ValidationErrorCode =
  | 'REQUIRED'
  | 'NAME_TOO_SHORT'
  | 'NAME_INVALID_CHARS'
  | 'EMAIL_MISSING_AT'
  | 'EMAIL_INVALID_DOMAIN'
  | 'EMAIL_INVALID_FORMAT'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_MISSING_UPPER'
  | 'PASSWORD_MISSING_LOWER'
  | 'PASSWORD_MISSING_DIGIT'
  | 'PASSWORD_MISSING_SYMBOL';

export interface ValidationResult {
  readonly valid: boolean;
  /** Vuoto se `valid` è true; ordinato per priorità di lettura (il primo è quello da annunciare). */
  readonly errors: readonly ValidationErrorCode[];
}
