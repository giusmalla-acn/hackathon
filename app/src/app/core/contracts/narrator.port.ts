// CONGELATO dopo S0
export type NarratorPoliteness = 'polite' | 'assertive';

/**
 * Porta per l'output vocale/screen reader (es. aria-live, Web Speech API).
 * Classe astratta per poterla usare come token di DI.
 *
 * Privacy: le implementazioni restano locali al browser e non inoltrano il testo all'AI.
 */
export abstract class Narrator {
  /** `politeness` predefinita: 'polite'. Usare 'assertive' solo per errori e avvisi urgenti. */
  abstract say(text: string, politeness?: NarratorPoliteness): void;
  abstract stop(): void;
  abstract repeatLast(): void;
}
