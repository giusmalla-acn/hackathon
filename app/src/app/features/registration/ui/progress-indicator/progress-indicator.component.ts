import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * "Passo N di totale" in una regione live sempre presente nel DOM, così gli aggiornamenti
 * vengono annunciati. Fuori dai passi con campo (`step` null) la regione resta vuota.
 */
@Component({
  selector: 'app-progress-indicator',
  standalone: true,
  template: `
    <p class="progress" aria-live="polite">
      @if (step(); as current) {
        Passo {{ current }} di {{ total() }}
      }
    </p>
  `,
  styles: `
    .progress {
      margin: 0;
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressIndicatorComponent {
  readonly step = input.required<number | null>();
  readonly total = input.required<number>();
}
