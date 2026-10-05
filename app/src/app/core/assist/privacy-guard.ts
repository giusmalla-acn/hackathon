import type {
  AssistFieldContext,
  AssistRequest,
  ExplanationStyle,
  ValidationErrorCode,
} from '../contracts';

/**
 * Filtro di privacy applicato a ogni richiesta prima che lasci il browser.
 *
 * - Lancia `AssistPrivacyError` se la richiesta trasporta valori (una chiave `value` a
 *   qualsiasi profondità) o codici d'errore che non sono codici.
 * - Ricostruisce la richiesta copiando solo i campi del contratto: tutto il resto viene scartato.
 * - Nei testi sostituisce indirizzi email e sequenze simili a password.
 *
 * I messaggi d'errore indicano solo il percorso del dato, mai il dato.
 */
export class AssistPrivacyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssistPrivacyError';
  }
}

export const REDACTED_EMAIL = '[email rimossa]';
export const REDACTED_SECRET = '[dato rimosso]';

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['value', 'values']);
const ERROR_CODE_PATTERN = /^[A-Z][A-Z_]*$/;
const FIELD_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
const STYLES: ReadonlySet<string> = new Set<ExplanationStyle>(['brief', 'detailed', 'simple']);

/** `nome@dominio`, anche con uno spazio attorno alla chiocciola. */
const EMAIL_PATTERN = /[^\s@]+\s?@\s?[^\s@]+/gu;
/** Punteggiatura normale della prosa: da sola non rende un testo "simile a una password". */
const PROSE_PUNCTUATION = `'’\\-.,;:!?()"«»“”\\[\\]`;
const EDGE_PUNCTUATION = new RegExp(`^[${PROSE_PUNCTUATION}]+|[${PROSE_PUNCTUATION}]+$`, 'gu');
const SYMBOL = new RegExp(`[^\\p{L}\\p{N}${PROSE_PUNCTUATION}]`, 'u');
const MIN_SECRET_LENGTH = 6;

export function guardAssistRequest(request: AssistRequest): AssistRequest {
  assertNoValues(request, 'request');

  const field = guardField(request.field);
  const style = STYLES.has(request.style ?? '') ? { style: request.style } : {};

  switch (request.skill) {
    case 'explain':
      return { skill: 'explain', field, ...style };
    case 'example':
      return { skill: 'example', field, ...style };
    case 'rephrase':
      return {
        skill: 'rephrase',
        field,
        ...style,
        previousText: redactSensitiveText(requireString(request.previousText, 'previousText')),
      };
    case 'error-hint':
      return { skill: 'error-hint', field, ...style, errorCodes: guardErrorCodes(request.errorCodes) };
    case 'question':
      return {
        skill: 'question',
        field,
        ...style,
        question: redactSensitiveText(requireString(request.question, 'question')),
      };
    default:
      throw new AssistPrivacyError('Skill di assistenza sconosciuta.');
  }
}

/** Sostituisce email e sequenze simili a password; il resto del testo resta invariato. */
export function redactSensitiveText(text: string): string {
  return text
    .replace(EMAIL_PATTERN, REDACTED_EMAIL)
    .replace(/\S+/gu, (token) => (looksLikeSecret(token) ? REDACTED_SECRET : token));
}

/**
 * Token senza spazi, lungo almeno 6 caratteri, che mescola lettere con cifre o simboli
 * (es. `Girasole42`, `ciao$mondo`), oppure una lunga sequenza di sole cifre (PIN, telefono).
 */
function looksLikeSecret(token: string): boolean {
  const core = token.replace(EDGE_PUNCTUATION, '');
  if (core.length < MIN_SECRET_LENGTH) {
    return false;
  }
  if (/^\p{N}+$/u.test(core)) {
    return true;
  }
  const hasLetter = /\p{L}/u.test(core);
  const hasDigit = /\p{N}/u.test(core);
  return hasLetter && (hasDigit || SYMBOL.test(core));
}

function assertNoValues(node: unknown, path: string): void {
  if (Array.isArray(node)) {
    node.forEach((item, index) => assertNoValues(item, `${path}[${index}]`));
    return;
  }
  if (typeof node !== 'object' || node === null) {
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new AssistPrivacyError(`La richiesta contiene un valore in "${path}.${key}".`);
    }
    assertNoValues(child, `${path}.${key}`);
  }
}

function guardField(field: AssistFieldContext): AssistFieldContext {
  if (typeof field !== 'object' || field === null) {
    throw new AssistPrivacyError('Contesto del campo mancante.');
  }
  if (typeof field.fieldId !== 'string' || !FIELD_ID_PATTERN.test(field.fieldId)) {
    throw new AssistPrivacyError('Identificativo del campo non valido.');
  }
  return {
    fieldId: field.fieldId,
    label: redactSensitiveText(requireString(field.label, 'field.label')),
    purpose: redactSensitiveText(requireString(field.purpose, 'field.purpose')),
    rules: requireArray(field.rules, 'field.rules').map((rule, index) =>
      redactSensitiveText(requireString(rule, `field.rules[${index}]`)),
    ),
    step: requireCount(field.step, 'field.step'),
    totalSteps: requireCount(field.totalSteps, 'field.totalSteps'),
  };
}

function guardErrorCodes(
  codes: readonly ValidationErrorCode[],
): readonly [ValidationErrorCode, ...ValidationErrorCode[]] {
  const list = requireArray(codes, 'errorCodes');
  if (list.length === 0) {
    throw new AssistPrivacyError('error-hint richiede almeno un codice d\'errore.');
  }
  list.forEach((code, index) => {
    if (typeof code !== 'string' || !ERROR_CODE_PATTERN.test(code)) {
      throw new AssistPrivacyError(`"errorCodes[${index}]" non è un codice d'errore.`);
    }
  });
  const [first, ...rest] = list;
  return [first, ...rest];
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new AssistPrivacyError(`"${path}" deve essere un testo.`);
  }
  return value;
}

function requireArray<T>(value: readonly T[], path: string): readonly T[] {
  if (!Array.isArray(value)) {
    throw new AssistPrivacyError(`"${path}" deve essere un elenco.`);
  }
  return value;
}

function requireCount(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new AssistPrivacyError(`"${path}" deve essere un intero non negativo.`);
  }
  return value;
}
