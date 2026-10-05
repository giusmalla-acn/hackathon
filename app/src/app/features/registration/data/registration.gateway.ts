import { Injectable } from '@angular/core';
import type { FieldId } from '../../../core/contracts';

export type RegistrationValues = Readonly<Record<FieldId, string>>;

/**
 * Invio della registrazione finale: l'unico punto in cui i valori lasciano lo store.
 * Classe astratta come token di DI; l'MVP usa il mock.
 */
@Injectable({ providedIn: 'root', useFactory: () => new MockRegistrationGateway() })
export abstract class RegistrationGateway {
  abstract register(values: RegistrationValues): Promise<void>;
}

/** Simula il backend: non memorizza né registra i valori. */
@Injectable()
export class MockRegistrationGateway extends RegistrationGateway {
  register(_values: RegistrationValues): Promise<void> {
    return Promise.resolve();
  }
}
