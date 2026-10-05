import type Anthropic from '@anthropic-ai/sdk';

import type { ExampleRequest, ExplainRequest, RephraseRequest } from '../contract';
import { COMMON_RULES, complete, describeField, styleHint } from './llm';

export type FieldExplainerRequest = ExplainRequest | RephraseRequest | ExampleRequest;

const SYSTEM = `Sei l'assistente vocale di un modulo di registrazione accessibile, usato anche da persone cieche, ipovedenti o con difficoltà cognitive.
Il tuo compito è aiutare a capire cosa inserire in un singolo campo del modulo, partendo solo dalla sua descrizione.

${COMMON_RULES}
- Per gli esempi usa solo dati palesemente inventati. Un indirizzo email descrivilo a parole, per esempio "un nome, poi la chiocciola, poi il dominio": non scriverlo mai per intero. Non proporre mai una password pronta da usare: descrivi com'è fatta una password valida.`;

const TASKS: Record<FieldExplainerRequest['skill'], string> = {
  explain: 'Spiega a cosa serve il campo e cosa bisogna inserire, rispettando le regole del campo.',
  rephrase:
    "L'utente non ha capito la spiegazione precedente. Spiega lo stesso campo con parole diverse e più semplici, senza ripetere le stesse frasi.",
  example: 'Fai un esempio concreto di come compilare il campo, nel rispetto delle sue regole.',
};

export async function runFieldExplainer(
  client: Anthropic,
  request: FieldExplainerRequest,
  signal: AbortSignal,
): Promise<string> {
  const parts = [TASKS[request.skill], styleHint(request.style), describeField(request.field)];
  if (request.skill === 'rephrase') {
    parts.push(`<spiegazione_precedente>\n${request.previousText}\n</spiegazione_precedente>`);
  }
  return complete(client, SYSTEM, parts.join('\n\n'), signal);
}
