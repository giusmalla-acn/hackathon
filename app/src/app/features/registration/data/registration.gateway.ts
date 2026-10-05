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

/** Latenza simulata del backend, abbastanza lunga da rendere percepibile lo stato di invio. */
export const MOCK_REGISTRATION_DELAY_MS = 500;

/** Simula il backend: risponde dopo `MOCK_REGISTRATION_DELAY_MS` e non memorizza né registra i valori. */
@Injectable()
export class MockRegistrationGateway extends RegistrationGateway {
  register(_values: RegistrationValues): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, MOCK_REGISTRATION_DELAY_MS));
  }
}
