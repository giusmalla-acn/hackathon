import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { COMPLETION_TITLE } from '../registration-messages';

/** Conferma finale (spec §2.5): il wizard porta il focus sul titolo. */
@Component({
  selector: 'app-completion',
  standalone: true,
  template: `
    <h1 tabindex="-1">{{ title }}</h1>
    <p>Grazie, {{ name().trim() }}. Il tuo account è stato creato.</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompletionComponent {
  readonly name = input.required<string>();

  protected readonly title = COMPLETION_TITLE;
}
