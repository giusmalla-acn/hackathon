/**
 * Contratto tra app e agente AI di assistenza.
 * Copia speculare in agents/src/contract.ts: tenere sincronizzato.
 *
 * Privacy: i valori digitati dall'utente non entrano MAI in questi tipi.
 * Verso l'AI viaggiano solo metadati del campo, codici di errore e testi già pronunciati dall'app.
 */
import type { FieldId } from './field-definition.model';
import type { ValidationErrorCode } from './validation.model';

export type AssistSkill = 'explain' | 'rephrase' | 'example' | 'error-hint' | 'question';

export type ExplanationStyle = 'brief' | 'detailed' | 'simple';

/** Solo metadati del campo: nessun valore, nemmeno parziale, mascherato o la sua lunghezza. */
export interface AssistFieldContext {
  readonly fieldId: FieldId;
  readonly label: string;
  readonly purpose: string;
  readonly rules: readonly string[];
  /** Posizione del campo nel percorso (1-based) e totale, per orientare l'utente. */
  readonly step: number;
  readonly totalSteps: number;
}

interface AssistRequestBase {
  readonly field: AssistFieldContext;
  readonly style?: ExplanationStyle;
}

export interface ExplainRequest extends AssistRequestBase {
  readonly skill: 'explain';
}

export interface RephraseRequest extends AssistRequestBase {
  readonly skill: 'rephrase';
  /** Ultimo testo pronunciato dall'app (mai input dell'utente). */
  readonly previousText: string;
}

export interface ExampleRequest extends AssistRequestBase {
  readonly skill: 'example';
}

export interface ErrorHintRequest extends AssistRequestBase {
  readonly skill: 'error-hint';
  readonly errorCodes: readonly [ValidationErrorCode, ...ValidationErrorCode[]];
}

export interface QuestionRequest extends AssistRequestBase {
  readonly skill: 'question';
  /** Domanda libera dell'utente sul campo; l'app non deve inserirvi il valore digitato. */
  readonly question: string;
}

export type AssistRequest =
  | ExplainRequest
  | RephraseRequest
  | ExampleRequest
  | ErrorHintRequest
  | QuestionRequest;

/** Azione che l'app può eseguire in risposta a una domanda libera. */
export type AssistIntent =
  | 'answer'
  | 'repeat'
  | 'explain'
  | 'rephrase'
  | 'example'
  | 'previous-field'
  | 'next-field'
  | 'stop'
  | 'unknown';

export interface AssistResponse {
  readonly text: string;
  readonly source: 'ai' | 'fallback';
  readonly intent?: AssistIntent;
}
