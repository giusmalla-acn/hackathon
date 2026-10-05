import type { ValidationErrorCode } from './validation.model';

export type FieldId = 'name' | 'email' | 'password';

export type FieldInputType = 'text' | 'email' | 'password';

export type FieldAutocomplete = 'name' | 'email' | 'new-password';

/**
 * Definizione statica di un campo del form guidato: solo testi e metadati.
 *
 * Privacy: non contiene mai valori digitati dall'utente; `example` è sempre fittizio.
 */
export interface FieldDefinition {
  readonly id: FieldId;
  readonly label: string;
  readonly inputType: FieldInputType;
  readonly autocomplete: FieldAutocomplete;
  /** Cosa va inserito. */
  readonly purpose: string;
  /** Perché lo chiediamo. */
  readonly why: string;
  /** Esempio fittizio da leggere ad alta voce. */
  readonly example: string;
  /** Regole leggibili, nell'ordine in cui vanno annunciate. */
  readonly rules: readonly string[];
  /** Spiegazioni alternative usate quando l'utente chiede di riformulare (anche come fallback senza AI). */
  readonly alternativeExplanations: readonly string[];
  /** Messaggio per ciascun codice applicabile a questo campo. */
  readonly errorMessages: Readonly<Partial<Record<ValidationErrorCode, string>>>;
}
