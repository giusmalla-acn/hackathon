/**
 * Filtro applicato a ogni testo prodotto dall'AI prima di restituirlo all'app.
 * Stesse regole di app/src/app/core/assist/output-guard.ts: l'app lo riapplica comunque.
 *
 * Funzione pura: restituisce il testo normalizzato (spazi compattati) oppure lancia
 * `OutputGuardError`. Il messaggio d'errore non contiene mai il testo scartato.
 */
export const ASSIST_OUTPUT_MAX_LENGTH = 300;

export type OutputGuardReason = 'not-string' | 'empty' | 'too-long' | 'unsafe';

export class OutputGuardError extends Error {
  constructor(readonly reason: OutputGuardReason) {
    super(`Testo AI scartato dall'output-guard: ${reason}`);
    this.name = 'OutputGuardError';
  }
}

const UNSAFE_PATTERNS: readonly RegExp[] = [
  // Caratteri non stampabili: controllo, formato (zero-width, bidi), privati, non assegnati.
  /\p{C}/u,
  // URL con schema (http://, ftp://, ...) o pseudo-schemi pericolosi.
  /[a-z][a-z\d+.-]*:\/\//iu,
  /(?:^|[^\p{L}\p{N}])(?:mailto|javascript|data|vbscript|file|tel):/iu,
  /(?:^|[^\p{L}\p{N}])www\./iu,
  // Domini senza schema, es. "esempio.it/pagina".
  /(?:^|[^\p{L}\p{N}.@-])[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.(?:it|com|org|net|eu|io|info|biz|gov|edu|app|dev|ai|co|uk|de|fr|es|me|tv|ly)(?![\p{L}\p{N}])/iu,
  // Email.
  /[^\s@]+\s?@\s?[^\s@]+/u,
];

export function guardOutput(text: unknown): string {
  if (typeof text !== 'string') {
    throw new OutputGuardError('not-string');
  }
  const normalized = text.replace(/\s+/gu, ' ').trim();
  if (normalized === '') {
    throw new OutputGuardError('empty');
  }
  if (normalized.length > ASSIST_OUTPUT_MAX_LENGTH) {
    throw new OutputGuardError('too-long');
  }
  if (UNSAFE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new OutputGuardError('unsafe');
  }
  return normalized;
}
