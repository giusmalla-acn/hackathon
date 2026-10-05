import type Anthropic from '@anthropic-ai/sdk';

import type { ErrorHintRequest, ValidationErrorCode } from '../contract';
import { COMMON_RULES, complete, describeField, styleHint } from './llm';

/** Significato di ogni codice: il modello riceve solo questo, mai il valore che l'ha causato. */
const ERROR_MEANINGS: Record<ValidationErrorCode, string> = {
  REQUIRED: 'il campo è vuoto ma è obbligatorio',
  NAME_TOO_SHORT: 'il nome è troppo corto',
  NAME_INVALID_CHARS: 'il nome contiene caratteri non ammessi, come numeri o simboli',
  EMAIL_MISSING_AT: "nell'indirizzo email manca la chiocciola",
  EMAIL_INVALID_DOMAIN: "la parte dopo la chiocciola non è un dominio valido, per esempio manca il punto",
  EMAIL_INVALID_FORMAT: "l'indirizzo email non ha un formato valido",
  PASSWORD_TOO_SHORT: 'la password è troppo corta',
  PASSWORD_MISSING_UPPER: 'nella password manca una lettera maiuscola',
  PASSWORD_MISSING_LOWER: 'nella password manca una lettera minuscola',
  PASSWORD_MISSING_DIGIT: 'nella password manca un numero',
  PASSWORD_MISSING_SYMBOL: 'nella password manca un simbolo',
};

const SYSTEM = `Sei l'assistente vocale di un modulo di registrazione accessibile, usato anche da persone cieche, ipovedenti o con difficoltà cognitive.
Il tuo compito è trasformare gli errori di validazione di un campo in un consiglio gentile e pratico su come correggerlo.

${COMMON_RULES}
- Gli errori sono in ordine di importanza: parti dal primo. Di' cosa fare, non solo cosa è sbagliato.
- Non dare la colpa all'utente e non usare termini tecnici o i codici di errore.`;

export async function runErrorCoach(
  client: Anthropic,
  request: ErrorHintRequest,
  signal: AbortSignal,
): Promise<string> {
  const errors = request.errorCodes.map((code) => `- ${ERROR_MEANINGS[code]}`).join('\n');
  const prompt = [
    'Il valore inserito nel campo non è valido. Spiega come correggerlo.',
    styleHint(request.style),
    describeField(request.field),
    `<errori>\n${errors}\n</errori>`,
  ].join('\n\n');
  return complete(client, SYSTEM, prompt, signal);
}
