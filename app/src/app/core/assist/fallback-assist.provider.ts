import { Injectable, inject } from '@angular/core';
import { type Observable, of } from 'rxjs';

import type {
  AssistFieldContext,
  AssistIntent,
  AssistRequest,
  AssistResponse,
  FieldDefinition,
  FieldId,
  RephraseRequest,
  ValidationErrorCode,
} from '../contracts';
import { ASSIST_FALLBACK_FIELDS, AssistProvider } from './assist-provider';
import {
  NO_MORE_EXPLANATIONS,
  errorAnnouncement,
  errorMessageFor,
  joinSentences,
} from './assist-texts';

const LAST_RESORT = 'Non ho altre informazioni su questo campo. Premi Ripeti per riascoltare le istruzioni.';

/** Parole chiave per capire una domanda libera senza AI. L'ordine conta: vince la prima. */
const QUESTION_INTENTS: readonly (readonly [RegExp, AssistIntent])[] = [
  [/\b(?:stop|basta|fermati|silenzio|zitto)/i, 'stop'],
  [/\b(?:ripeti|ridimmi|non ho sentito)/i, 'repeat'],
  [/\besempi/i, 'example'],
  [/\b(?:altro modo|riformula|non ho capito|non capisco)/i, 'rephrase'],
  [/\b(?:spiega|cosa devo|cosa significa|cosa vuol|perch)/i, 'explain'],
  [/\b(?:indietro|precedente)/i, 'previous-field'],
  [/\b(?:avanti|prossimo|successivo)/i, 'next-field'],
];

/**
 * Assistenza senza AI, costruita dai testi statici di `FieldDefinition`. Non restituisce mai
 * testo vuoto.
 *
 * "Spiega in altro modo" scorre le `alternativeExplanations` senza mai ripeterle nella stessa
 * sessione (vita del servizio); finite quelle, invita a usare Esempio o Ripeti.
 */
@Injectable()
export class FallbackAssistProvider extends AssistProvider {
  private readonly fields = inject(ASSIST_FALLBACK_FIELDS);

  /** Indici delle spiegazioni già usate, per campo. Solo indici: nessun testo dell'utente. */
  private readonly usedExplanations = new Map<FieldId, Set<number>>();

  override assist(request: AssistRequest): Observable<AssistResponse> {
    return of(this.respond(request));
  }

  respond(request: AssistRequest): AssistResponse {
    const field = this.fields.find((candidate) => candidate.id === request.field?.fieldId);
    const { text, intent } = this.compose(request, field);
    return {
      text: joinSentences(text) || joinSentences(request.field?.purpose) || LAST_RESORT,
      source: 'fallback',
      ...(intent ? { intent } : {}),
    };
  }

  private compose(
    request: AssistRequest,
    field: FieldDefinition | undefined,
  ): { readonly text: string; readonly intent?: AssistIntent } {
    switch (request.skill) {
      case 'explain':
        return { text: this.explain(request.field, field) };
      case 'example':
        return { text: this.example(request.field, field) };
      case 'rephrase':
        return { text: this.rephrase(request, field) };
      case 'error-hint':
        return { text: this.errorHint(request.field, field, request.errorCodes[0]) };
      case 'question':
        return this.answer(request.field, field, request.question);
      default:
        return { text: '' };
    }
  }

  private explain(context: AssistFieldContext, field: FieldDefinition | undefined): string {
    return field
      ? joinSentences(field.purpose, field.why, ...field.rules)
      : joinSentences(context.purpose, ...(context.rules ?? []));
  }

  private example(context: AssistFieldContext, field: FieldDefinition | undefined): string {
    const example = field?.example.trim().replace(/[.!?]+$/u, '');
    if (!example) {
      return joinSentences(`Non ho un esempio per il campo ${context.label}.`, context.purpose);
    }
    return `Esempio: ${example}. È solo un esempio, il campo non è stato modificato.`;
  }

  private rephrase(request: RephraseRequest, field: FieldDefinition | undefined): string {
    if (!field) {
      return NO_MORE_EXPLANATIONS;
    }
    const explanations = field.alternativeExplanations
      .map((text) => text.trim())
      .filter((text) => text !== '');
    const used = this.usedExplanations.get(field.id) ?? new Set<number>();
    this.usedExplanations.set(field.id, used);
    const previous = normalize(request.previousText ?? '');

    for (const [index, text] of explanations.entries()) {
      if (used.has(index)) {
        continue;
      }
      used.add(index);
      // Una spiegazione appena pronunciata (anche dall'AI) conta come già usata.
      if (normalize(text) !== previous) {
        return `Spiegazione ${index + 1} di ${explanations.length}: ${text}`;
      }
    }
    return NO_MORE_EXPLANATIONS;
  }

  private errorHint(
    context: AssistFieldContext,
    field: FieldDefinition | undefined,
    code: ValidationErrorCode | undefined,
  ): string {
    const label = field?.label ?? context.label;
    return code
      ? errorAnnouncement(label, errorMessageFor(field, code))
      : this.explain(context, field);
  }

  private answer(
    context: AssistFieldContext,
    field: FieldDefinition | undefined,
    question: string,
  ): { readonly text: string; readonly intent: AssistIntent } {
    const intent = QUESTION_INTENTS.find(([pattern]) => pattern.test(question))?.[1] ?? 'unknown';
    switch (intent) {
      case 'stop':
        return { intent, text: 'Va bene, mi fermo.' };
      case 'repeat':
        return { intent, text: field?.purpose ?? context.purpose };
      case 'example':
        return { intent, text: this.example(context, field) };
      case 'rephrase':
        return {
          intent,
          text: this.rephrase({ skill: 'rephrase', field: context, previousText: '' }, field),
        };
      case 'explain':
        return { intent, text: this.explain(context, field) };
      case 'previous-field':
        return { intent, text: 'Torno al passo precedente.' };
      case 'next-field':
        return { intent, text: 'Vado avanti.' };
      default:
        return {
          intent: 'unknown',
          text: joinSentences(
            'Senza assistente posso solo leggerti le istruzioni.',
            field?.purpose ?? context.purpose,
            'Puoi premere Spiega in altro modo oppure Esempio.',
          ),
        };
    }
  }
}

function normalize(text: string): string {
  return text.replace(/\s+/gu, ' ').trim().toLocaleLowerCase('it');
}
