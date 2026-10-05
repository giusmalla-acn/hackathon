import { Routes } from '@angular/router';

export const REGISTRATION_ROUTES: Routes = [
  {
    path: '',
    title: 'Registrazione guidata',
    loadComponent: () =>
      import('./ui/registration-wizard/registration-wizard.component').then(
        (m) => m.RegistrationWizardComponent,
      ),
  },
];
