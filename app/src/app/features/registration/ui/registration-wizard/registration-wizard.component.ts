import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  viewChild,
} from '@angular/core';

import { FocusService } from '../../../../core/a11y/focus.service';
import { AssistPanelComponent, type AssistNavigation } from '../../../../core/assist';
import type { FieldId } from '../../../../core/contracts';
import { Narrator } from '../../../../core/contracts';
import { SpeechPreferencesStore } from '../../../../core/narration';
import { REGISTRATION_FIELDS } from '../../data/registration-fields';
import { FIELD_STEPS, fieldStepNumber, isFieldStep, type WizardStep } from '../../domain/wizard.machine';
import { RegistrationStore } from '../../state/registration.store';
import { CompletionComponent } from '../completion/completion.component';
import { FieldStepComponent } from '../field-step/field-step.component';
import { ProgressIndicatorComponent } from '../progress-indicator/progress-indicator.component';
import {
  completionAnnouncement,
  errorAnnouncement,
  modeAnnouncement,
  stepTitle,
  SUBMIT_FAILED_MESSAGE,
  SUMMARY_TITLE,
  summaryAnnouncement,
  WELCOME_INTRO,
  WELCOME_TITLE,
} from '../registration-messages';
import { ReviewStepComponent } from '../review-step/review-step.component';
import { WelcomeComponent } from '../welcome/welcome.component';

/**
 * Shell del percorso guidato. Ogni azione dell'utente aggiorna lo store, annuncia il nuovo
 * stato in modo sincrono (dentro il gesto, così la voce integrata è sbloccata) e, dopo il
 * render, sposta il focus sul titolo del passo o, in caso di errore, sul campo.
 */
@Component({
  selector: 'app-registration-wizard',
  standalone: true,
  imports: [
    AssistPanelComponent,
    CompletionComponent,
    FieldStepComponent,
    ProgressIndicatorComponent,
    ReviewStepComponent,
    WelcomeComponent,
  ],
  templateUrl: './registration-wizard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(keydown.escape)': 'narrator.stop()',
  },
})
export class RegistrationWizardComponent {
  protected readonly store = inject(RegistrationStore);
  protected readonly narrator = inject(Narrator);
  private readonly focus = inject(FocusService);
  private readonly prefs = inject(SpeechPreferencesStore);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  private readonly fieldStep = viewChild(FieldStepComponent);

  protected readonly fields = REGISTRATION_FIELDS;
  protected readonly totalSteps = FIELD_STEPS.length;
  protected readonly step = this.store.currentStep;
  protected readonly field = this.store.currentField;
  protected readonly stepNumber = computed(() => fieldStepNumber(this.step()));
  protected readonly submitFailedMessage = SUBMIT_FAILED_MESSAGE;

  protected start(): void {
    const prefix = modeAnnouncement(this.prefs.mode());
    this.afterAction(this.store.next(), prefix);
  }

  protected setValue(field: FieldId, value: string): void {
    // Spec §1.10: la digitazione interrompe la voce in corso.
    this.narrator.stop();
    this.store.setValue(field, value);
  }

  protected next(event: Event): void {
    event.preventDefault();
    this.afterAction(this.store.next());
  }

  protected back(): void {
    this.afterAction(this.store.prev());
  }

  protected edit(field: FieldId): void {
    this.store.edit(field);
    this.afterAction(true);
  }

  protected async confirm(): Promise<void> {
    this.afterAction(await this.store.submit());
    if (this.store.submitFailed()) {
      // Il focus resta su "Conferma registrazione", che ora descrive l'errore.
      this.narrator.say(SUBMIT_FAILED_MESSAGE, 'assertive');
    }
  }

  /** Comandi vocali "campo precedente/successivo" del pannello di assistenza. */
  protected onAssistNavigate(direction: AssistNavigation): void {
    this.afterAction(direction === 'previous' ? this.store.prev() : this.store.next());
  }

  protected focusField(): void {
    this.fieldStep()?.focusInput();
  }

  /**
   * Se il campo mostrato ha errori li segnala, altrimenti annuncia il passo se `moved`.
   * Lo store azzera gli errori del campo di arrivo con Avanti/Indietro: qui restano solo
   * quelli appena calcolati o quelli di un invio non valido.
   */
  private afterAction(moved: boolean, prefix?: string): void {
    const step = this.step();
    const field = this.field();
    const error = field
      ? errorAnnouncement(field, this.store.currentErrors(), this.store.values()[field.id])
      : null;

    if (error) {
      this.narrator.say(error, 'assertive');
      this.afterRender(() => this.fieldStep()?.focusInput());
    } else if (moved) {
      this.narrator.say([prefix, this.entryText(step)].filter(Boolean).join(' '));
      this.afterRender(() => this.focusTitle());
    }
  }

  /** Spec §2: in modalità screen reader il titolo lo legge il focus; con la voce integrata va pronunciato. */
  private entryText(step: WizardStep): string {
    const values = this.store.values();
    const voice = this.prefs.mode() === 'voice';
    const withTitle = (title: string, text: string): string => (voice ? `${title}. ${text}` : text);

    if (isFieldStep(step)) {
      const field = this.field()!;
      return withTitle(stepTitle(this.stepNumber()!, this.totalSteps, field), field.purpose);
    }
    switch (step) {
      case 'welcome':
        return withTitle(WELCOME_TITLE, WELCOME_INTRO);
      case 'summary':
        return withTitle(SUMMARY_TITLE, summaryAnnouncement(values));
      case 'done':
        return completionAnnouncement(values.name);
    }
  }

  private focusTitle(): void {
    const title = this.host.nativeElement.querySelector<HTMLElement>('h1');
    if (title) {
      this.focus.focusStep(title);
    }
  }

  private afterRender(callback: () => void): void {
    afterNextRender(callback, { injector: this.injector });
  }
}
