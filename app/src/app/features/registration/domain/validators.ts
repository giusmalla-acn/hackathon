import type { FieldId, ValidationErrorCode, ValidationResult } from '../../../core/contracts';

/**
 * Validatori puri dei campi. Restituiscono solo codici d'errore, mai il valore.
 * L'ordine dei codici è l'ordine di lettura: il primo è quello da annunciare.
 */

export const NAME_MIN_LETTERS = 2;
export const PASSWORD_MIN_LENGTH = 8;

const LETTER = /\p{L}/u;
const LETTERS = /\p{L}/gu;
/** Lettere (anche accentate o con segni combinanti), spazi, apostrofo dritto o tipografico, trattino. */
const NAME_ALLOWED = /^[\p{L}\p{M} '’-]+$/u;
const DOMAIN_LABEL = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?$/u;
const WHITESPACE = /\s/u;
const DIGIT = /\p{Nd}/u;

function result(errors: ValidationErrorCode[]): ValidationResult {
  return { valid: errors.length === 0, errors };
}

export function validateName(value: string): ValidationResult {
  const name = value.trim();
  if (name === '') {
    return result(['REQUIRED']);
  }

  const errors: ValidationErrorCode[] = [];
  if (!NAME_ALLOWED.test(name)) {
    errors.push('NAME_INVALID_CHARS');
  }
  if ((name.match(LETTERS) ?? []).length < NAME_MIN_LETTERS) {
    errors.push('NAME_TOO_SHORT');
  }
  return result(errors);
}

export function validateEmail(value: string): ValidationResult {
  const email = value.trim();
  if (email === '') {
    return result(['REQUIRED']);
  }

  const at = email.indexOf('@');
  if (at === -1) {
    return result(['EMAIL_MISSING_AT']);
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (local === '' || domain.includes('@') || WHITESPACE.test(email)) {
    return result(['EMAIL_INVALID_FORMAT']);
  }

  const labels = domain.split('.');
  if (labels.length < 2 || !labels.every((label) => DOMAIN_LABEL.test(label))) {
    return result(['EMAIL_INVALID_DOMAIN']);
  }
  return result([]);
}

/**
 * Policy della spec: almeno 8 caratteri, almeno una lettera e almeno un numero.
 * Il contratto non ha un codice "manca una lettera": l'assenza di lettere si segnala con
 * PASSWORD_MISSING_LOWER (il messaggio dice "aggiungi una lettera").
 * Nessun trim: gli spazi fanno parte della password.
 */
export function validatePassword(value: string): ValidationResult {
  if (value === '') {
    return result(['REQUIRED']);
  }

  const errors: ValidationErrorCode[] = [];
  if ([...value].length < PASSWORD_MIN_LENGTH) {
    errors.push('PASSWORD_TOO_SHORT');
  }
  if (!LETTER.test(value)) {
    errors.push('PASSWORD_MISSING_LOWER');
  }
  if (!DIGIT.test(value)) {
    errors.push('PASSWORD_MISSING_DIGIT');
  }
  return result(errors);
}

export const FIELD_VALIDATORS: Readonly<Record<FieldId, (value: string) => ValidationResult>> = {
  name: validateName,
  email: validateEmail,
  password: validatePassword,
};
