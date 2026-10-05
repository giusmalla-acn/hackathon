import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import { VoiceSettingsComponent } from '../../../../core/narration';
import { WELCOME_INTRO, WELCOME_TITLE } from '../registration-messages';

/** Prima schermata: scelta della modalità di lettura e "Inizia", che vale come gesto utente per la voce. */
@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [VoiceSettingsComponent],
  template: `
    <h1 tabindex="-1">{{ title }}</h1>
    <p>{{ intro }}</p>
    <app-voice-settings />
    <div class="actions">
      <button type="button" class="button--primary" (click)="start.emit()">Inizia</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent {
  readonly start = output<void>();

  protected readonly title = WELCOME_TITLE;
  protected readonly intro = WELCOME_INTRO;
}
