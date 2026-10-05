/**
 * Filtro applicato a ogni testo prodotto dall'AI prima di pronunciarlo.
 *
 * Restituisce il testo normalizzato (spazi compattati) se è accettabile, altrimenti `null`:
 * in quel caso l'orchestratore usa il fallback locale.
 */
export const ASSIST_OUTPUT_MAX_LENGTH = 300;

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

export function guardAssistOutput(text: unknown): string | null {
  if (typeof text !== 'string') {
    return null;
  }
  const normalized = text.replace(/\s+/gu, ' ').trim();
  if (normalized === '' || normalized.length > ASSIST_OUTPUT_MAX_LENGTH) {
    return null;
  }
  return UNSAFE_PATTERNS.some((pattern) => pattern.test(normalized)) ? null : normalized;
}
