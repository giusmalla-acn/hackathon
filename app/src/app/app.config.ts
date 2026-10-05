import { provideHttpClient } from '@angular/common/http';
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
    provideHttpClient(),
    // Backend AI su /api/assist (proxy verso agents/), con i testi statici dei campi come fallback.
    provideAssist('ai', { fallback: REGISTRATION_FIELDS }),
  ]
};
