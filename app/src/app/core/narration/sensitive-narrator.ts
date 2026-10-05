/**
 * Annunci che contengono un dato sensibile chiesto dall'utente (es. la password letta lettera
 * per lettera): li pronuncia senza conservarli per `repeatLast()` e senza lasciarli nella
 * regione live. Estensione locale: il contratto `Narrator` è congelato.
 */
export abstract class SensitiveNarrator {
  abstract saySensitive(text: string): void;
}
