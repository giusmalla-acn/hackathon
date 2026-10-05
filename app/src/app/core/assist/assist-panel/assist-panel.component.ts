import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, type Subscription, map, switchMap } from 'rxjs';

import {
  type AssistFieldContext,
  type AssistRequest,
  type AssistResponse,
  type FieldDefinition,
  type FieldId,
  Narrator,
  type ValidationErrorCode,
} from '../../contracts';
import { SensitiveNarrator } from '../../narration/sensitive-narrator';
import { SpeechPreferencesStore } from '../../narration/speech-preferences.store';
import { AssistOrchestrator } from '../assist-orchestrator.service';
import { errorAnnouncement, errorMessageFor, joinSentences } from '../assist-texts';
import { SpeechRecognitionService } from '../speech-recognition.service';
import { spellOut } from '../spell-out';

export type AssistNavigation = 'previous' | 'next';

const PASSWORD_CONFIRM_QUESTION =
  'Stai per sentire la password ad alta voce. Assicurati che nessuno possa ascoltare. Vuoi continuare?';
const NOT_HEARD = 'Non ho sentito la domanda. Riprova, oppure usa i pulsanti.';
const REDACTED_VALUE = '[valore rimosso]';

let nextId = 0;

/**
 * Pulsanti di aiuto del passo, in ordine fisso: Ripeti · Spiega in altro modo · Esempio ·
 * Rileggi cosa ho scritto (· Fai una domanda a voce, se il browser lo supporta).
 *
 * Privacy: `value` serve solo alla rilettura locale. Verso l'orchestratore viaggiano soltanto
 * i metadati del campo e i testi già pronunciati dall'app, mai la rilettura.
 * Sul campo password il riconoscimento vocale è disattivato.
 */
@Component({
  selector: 'app-assist-panel',
  standalone: true,
  templateUrl: './assist-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistPanelComponent {
  private readonly narrator = inject(Narrator);
  /** Per la password letta su richiesta; senza, si ripiega su `Narrator.say()`. */
  private readonly sensitiveNarrator = inject(SensitiveNarrator, { optional: true });
  private readonly orchestrator = inject(AssistOrchestrator);
  private readonly prefs = inject(SpeechPreferencesStore);
  private readonly recognition = inject(SpeechRecognitionService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  readonly field = input.required<FieldDefinition>();
  readonly step = input.required<number>();
  readonly totalSteps = input.required<number>();
  /** Valore attuale del campo, solo per "Rileggi cosa ho scritto". */
  readonly value = input('');
  /** Errori attivi del campo, già ordinati per priorità. */
  readonly errorCodes = input<readonly ValidationErrorCode[]>([]);

  readonly navigate = output<AssistNavigation>();
  /** Chiede al passo di riportare il focus sul campo. */
  readonly focusFieldRequested = output<void>();

  protected readonly id = `assist-panel-${nextId++}`;
  protected readonly confirmText = PASSWORD_CONFIRM_QUESTION;
  protected readonly voiceSupported = this.recognition.supported;
  protected readonly voiceAllowed = computed(() => this.field().inputType !== 'password');
  protected readonly listening = this.recognition.listening;

  private readonly confirmingFor = signal<FieldId | null>(null);
  /** Legata al campo: cambiando passo la domanda sparisce. */
  protected readonly confirmingPassword = computed(() => this.confirmingFor() === this.field().id);

  private readonly confirmQuestionRef = viewChild<ElementRef<HTMLElement>>('confirmQuestion');

  /** Ogni comando sostituisce quello in attesa; `null` annulla senza chiedere nulla. */
  private readonly requests = new Subject<AssistRequest | null>();
  /** Ultimo testo di aiuto pronunciato, per "Spiega in altro modo". Mai la rilettura. */
  private lastHelp: { readonly fieldId: FieldId; readonly text: string } | null = null;
  private listeningSub: Subscription | null = null;

  constructor() {
    this.requests
      .pipe(
        switchMap((request) =>
          request
            ? this.orchestrator.assist(request).pipe(map((response) => ({ request, response })))
            : EMPTY,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ request, response }) => this.handleResponse(request, response));

    effect(() => {
      if (!this.voiceAllowed()) {
        untracked(() => this.stopListening());
      }
    });
    this.destroyRef.onDestroy(() => this.stopListening());
  }

  protected repeat(): void {
    this.cancelPending();
    const field = this.field();
    const firstError = this.errorCodes()[0];
    const text = joinSentences(
      `Passo ${this.step()} di ${this.totalSteps()}: ${field.label}.`,
      field.purpose,
      firstError ? errorAnnouncement(field.label, errorMessageFor(field, firstError)) : undefined,
    );
    this.sayHelp(text);
  }

  protected rephrase(): void {
    const field = this.field();
    const previousText =
      this.lastHelp?.fieldId === field.id ? this.lastHelp.text : field.purpose;
    this.requests.next({ skill: 'rephrase', field: this.context(), previousText });
  }

  protected example(): void {
    this.requests.next({ skill: 'example', field: this.context() });
  }

  protected readBack(): void {
    this.cancelPending();
    const field = this.field();
    const value = this.value();
    if (value === '') {
      this.narrator.say(`Il campo ${field.label} è vuoto.`);
      return;
    }
    if (field.inputType === 'password') {
      this.askPasswordConfirmation(field.id);
      return;
    }
    this.narrator.say(`Hai scritto: ${value}. Lettera per lettera: ${spellOut(value)}.`);
  }

  protected confirmPasswordReadBack(): void {
    this.confirmingFor.set(null);
    const text = `La password è: ${spellOut(this.value())}.`;
    if (this.sensitiveNarrator) {
      this.sensitiveNarrator.saySensitive(text);
    } else {
      this.narrator.say(text);
    }
    this.focusFieldRequested.emit();
  }

  protected cancelPasswordReadBack(): void {
    this.confirmingFor.set(null);
    this.narrator.stop();
    this.focusFieldRequested.emit();
  }

  protected toggleQuestion(): void {
    if (this.listeningSub) {
      this.stopListening();
      return;
    }
    if (!this.voiceAllowed()) {
      return;
    }
    this.cancelPending();
    this.narrator.stop();

    const fieldId = this.field().id;
    let heard = false;
    this.listeningSub = this.recognition
      .listenOnce()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (transcript) => {
          heard = true;
          if (this.field().id === fieldId) {
            this.requests.next({
              skill: 'question',
              field: this.context(),
              question: withoutValue(transcript, this.value()),
            });
          }
        },
        error: () => this.endListening(false),
        complete: () => this.endListening(heard),
      });
  }

  private askPasswordConfirmation(fieldId: FieldId): void {
    this.confirmingFor.set(fieldId);
    if (this.prefs.mode() === 'voice') {
      this.narrator.say(PASSWORD_CONFIRM_QUESTION);
    } else {
      // Lo screen reader legge la domanda dal focus: un annuncio live la duplicherebbe.
      this.narrator.stop();
    }
    afterNextRender(() => this.confirmQuestionRef()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  private handleResponse(request: AssistRequest, response: AssistResponse): void {
    // Risposta arrivata dopo un cambio di passo: non riguarda più il campo mostrato.
    if (request.field.fieldId !== this.field().id) {
      return;
    }
    switch (response.intent) {
      case 'stop':
        this.narrator.stop();
        return;
      case 'repeat':
        this.repeat();
        return;
      case 'previous-field':
        this.navigate.emit('previous');
        return;
      case 'next-field':
        this.navigate.emit('next');
        return;
      default:
        this.sayHelp(response.text);
    }
  }

  private sayHelp(text: string): void {
    this.lastHelp = { fieldId: this.field().id, text };
    this.narrator.say(text);
  }

  private context(): AssistFieldContext {
    const field = this.field();
    return {
      fieldId: field.id,
      label: field.label,
      purpose: field.purpose,
      rules: field.rules,
      step: this.step(),
      totalSteps: this.totalSteps(),
    };
  }

  private cancelPending(): void {
    this.requests.next(null);
  }

  private endListening(heard: boolean): void {
    this.listeningSub = null;
    if (!heard) {
      this.narrator.say(NOT_HEARD);
    }
  }

  private stopListening(): void {
    this.listeningSub?.unsubscribe();
    this.listeningSub = null;
  }
}

/** Toglie dalla domanda il valore digitato nel campo, se l'utente lo ha pronunciato. */
function withoutValue(question: string, value: string): string {
  const needle = value.trim();
  if (needle.length < 2) {
    return question;
  }
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return question.replace(new RegExp(escaped, 'giu'), REDACTED_VALUE);
}
