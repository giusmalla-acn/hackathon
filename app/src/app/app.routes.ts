import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'registration' },
  {
    path: 'registration',
    loadChildren: () =>
      import('./features/registration/registration.routes').then((m) => m.REGISTRATION_ROUTES),
  },
];
