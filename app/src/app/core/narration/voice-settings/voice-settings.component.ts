import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { type NarrationMode, SpeechPreferencesStore } from '../speech-preferences.store';

interface ModeOption {
  readonly value: NarrationMode;
  readonly label: string;
  readonly hint: string;
}

interface RateOption {
  readonly value: number;
  readonly label: string;
}

let nextId = 0;

/** Scelta di modalità e velocità della voce: scrive solo nello `SpeechPreferencesStore`. */
@Component({
  selector: 'app-voice-settings',
  standalone: true,
  templateUrl: './voice-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoiceSettingsComponent {
  private readonly prefs = inject(SpeechPreferencesStore);

  protected readonly id = `voice-settings-${nextId++}`;

  protected readonly modeOptions: readonly ModeOption[] = [
    { value: 'sr', label: 'Screen reader', hint: 'Gli annunci saranno letti dal tuo screen reader.' },
    { value: 'voice', label: 'Voce integrata', hint: "L'app legge i testi ad alta voce." },
  ];

  protected readonly rateOptions: readonly RateOption[] = [
    { value: 0.8, label: 'Lenta' },
    { value: 1, label: 'Normale' },
    { value: 1.2, label: 'Veloce' },
  ];

  protected readonly mode = this.prefs.mode;

  /** Opzione più vicina alla velocità salvata, che può non coincidere con un preset. */
  protected readonly selectedRate = computed(() => {
    const rate = this.prefs.rate();
    return this.rateOptions.reduce((best, option) =>
      Math.abs(option.value - rate) < Math.abs(best.value - rate) ? option : best,
    ).value;
  });

  protected setMode(mode: NarrationMode): void {
    this.prefs.setMode(mode);
  }

  protected setRate(rate: number): void {
    this.prefs.setRate(rate);
  }
}
