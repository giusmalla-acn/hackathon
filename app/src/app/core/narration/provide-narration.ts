import { A11yModule } from '@angular/cdk/a11y';
import { EnvironmentProviders, importProvidersFrom, makeEnvironmentProviders } from '@angular/core';

import { Narrator } from '../contracts';
import { NarrationService } from './narration.service';
import { SensitiveNarrator } from './sensitive-narrator';

/** Registra il `Narrator` dell'app: `inject(Narrator)` restituisce `NarrationService`. */
export function provideNarration(): EnvironmentProviders {
  return makeEnvironmentProviders([
    importProvidersFrom(A11yModule),
    { provide: Narrator, useExisting: NarrationService },
    { provide: SensitiveNarrator, useExisting: NarrationService },
  ]);
}
