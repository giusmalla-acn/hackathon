import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAssist } from './core/assist/provide-assist';
import { provideNarration } from './core/narration/provide-narration';
import { REGISTRATION_FIELDS } from './features/registration/data/registration-fields';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Include A11yModule della CDK (LiveAnnouncer, FocusMonitor).
    provideNarration(),
    // Solo fallback: nessun endpoint, quindi nessuna chiamata AI e testi statici dei campi.
    provideAssist(REGISTRATION_FIELDS),
  ]
};
