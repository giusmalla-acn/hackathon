import type { FieldDefinition, ValidationErrorCode } from '../../../core/contracts';
import type { NarrationMode } from '../../../core/narration';
import type { RegistrationValues } from '../data/registration.gateway';

/** Testi della spec (docs/a11y-test-script.md §2) usati dalla UI del percorso guidato. */

export const WELCOME_TITLE = 'Registrazione guidata';
export const WELCOME_INTRO =
  'Ti guideremo passo passo nella creazione del tuo account: nome, email e password, un dato alla volta. Scegli come vuoi sentire gli annunci, poi premi Inizia.';
export const SUMMARY_TITLE = 'Riepilogo dei dati';
export const COMPLETION_TITLE = 'Registrazione completata';

/** §2.1 — titolo del passo, che riceve il focus. */
export function stepTitle(step: number, totalSteps: number, field: FieldDefinition): string {
  return `Passo ${step} di ${totalSteps}: ${field.label}`;
}

/** §2.2 — il primo codice è quello da annunciare. */
export function errorAnnouncement(
  field: FieldDefinition,
  errors: readonly ValidationErrorCode[],
): string | null {
  const [code] = errors;
  if (!code) {
    return null;
  }
  const message = field.errorMessages[code] ?? 'il valore non è valido.';
  return `Errore nel campo ${field.label}: ${message}`;
}

/** §2.3 */
export function modeAnnouncement(mode: NarrationMode): string {
  return mode === 'voice'
    ? 'Modalità voce integrata attiva. Se usi uno screen reader, mettilo in pausa per evitare voci sovrapposte. Premi Esc per fermare la voce in qualsiasi momento.'
    : 'Modalità screen reader attiva. Gli annunci saranno letti dal tuo screen reader.';
}

/** Numero di caratteri della password, contando i code point come il validatore. */
export function passwordLength(password: string): number {
  return [...password].length;
}

/** §2.4 */
export function summaryAnnouncement(values: RegistrationValues): string {
  return (
    `Controlla i tuoi dati. Nome: ${values.name}. Email: ${values.email}. ` +
    `Password: inserita, ${passwordLength(values.password)} caratteri, non letta. ` +
    'Per correggere un dato premi Modifica accanto al dato. Per completare premi Conferma registrazione.'
  );
}

/** Il gateway ha rifiutato l'invio: si resta sul riepilogo con i dati intatti. */
export const SUBMIT_FAILED_MESSAGE =
  'Errore: non è stato possibile completare la registrazione. I tuoi dati sono ancora qui. Riprova premendo Conferma registrazione.';

/** §2.5 */
export function completionAnnouncement(name: string): string {
  return `Registrazione completata, ${name.trim()}. Il tuo account è stato creato.`;
}
