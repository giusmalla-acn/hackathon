import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { type Observable, Subject } from 'rxjs';

import { type AssistRequest, type AssistResponse, Narrator } from '../../contracts';
import { SpeechPreferencesStore } from '../../narration/speech-preferences.store';
import { AssistOrchestrator } from '../assist-orchestrator.service';
import { provideAssist } from '../provide-assist';
import { SpeechRecognitionService } from '../speech-recognition.service';
import { TEST_FIELDS, testField } from '../testing/assist-test-fields';
import { type AssistNavigation, AssistPanelComponent } from './assist-panel.component';

class FakeRecognition {
  supported = true;
  readonly listening = signal(false);
  /** Sessione di ascolto in corso: il test vi emette la trascrizione. */
  session: Subject<string> | null = null;
  readonly listenOnce = jest.fn((): Observable<string> => {
    this.session = new Subject<string>();
    return this.session.asObservable();
  });

  get active(): boolean {
    return this.session?.observed ?? false;
  }
}

describe('AssistPanelComponent', () => {
  let fixture: ComponentFixture<AssistPanelComponent>;
  let narrator: { say: jest.Mock; stop: jest.Mock; repeatLast: jest.Mock };
  let recognition: FakeRecognition;
  let orchestrator: AssistOrchestrator;
  let navigations: AssistNavigation[];
  let focusRequests: number;

  function create(supported = true): void {
    localStorage.clear();
    narrator = { say: jest.fn(), stop: jest.fn(), repeatLast: jest.fn() };
    recognition = new FakeRecognition();
    recognition.supported = supported;

    TestBed.configureTestingModule({
      imports: [AssistPanelComponent],
      providers: [
        provideAssist(TEST_FIELDS),
        { provide: Narrator, useValue: narrator },
        { provide: SpeechRecognitionService, useValue: recognition },
      ],
    });
    orchestrator = TestBed.inject(AssistOrchestrator);
    jest.spyOn(orchestrator, 'assist');

    fixture = TestBed.createComponent(AssistPanelComponent);
    navigations = [];
    focusRequests = 0;
    fixture.componentInstance.navigate.subscribe((direction) => navigations.push(direction));
    fixture.componentInstance.focusFieldRequested.subscribe(() => focusRequests++);
    setField('name');
    fixture.componentRef.setInput('step', 1);
    fixture.componentRef.setInput('totalSteps', 3);
    fixture.detectChanges();
  }

  function setField(id: 'name' | 'email' | 'password', step = 1): void {
    fixture.componentRef.setInput('field', testField(id));
    fixture.componentRef.setInput('step', step);
    fixture.detectChanges();
  }

  function setValue(value: string): void {
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
  }

  function buttons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button'));
  }

  function button(label: string): HTMLButtonElement {
    const found = buttons().find((candidate) => candidate.textContent?.trim() === label);
    if (!found) {
      throw new Error(`Pulsante non trovato: ${label}`);
    }
    return found;
  }

  function click(label: string): void {
    button(label).click();
    fixture.detectChanges();
  }

  function said(): string[] {
    return narrator.say.mock.calls.map(([text]) => text as string);
  }

  function sentRequests(): AssistRequest[] {
    return (orchestrator.assist as jest.Mock).mock.calls.map(([request]) => request as AssistRequest);
  }

  beforeEach(() => create());

  it('renders native buttons in the fixed order, visible text = accessible name', () => {
    expect(buttons().map((b) => b.textContent?.trim())).toEqual([
      'Ripeti',
      'Spiega in altro modo',
      'Esempio',
      'Rileggi cosa ho scritto',
      'Fai una domanda a voce',
    ]);
    for (const b of buttons()) {
      expect(b.type).toBe('button');
      expect(b.getAttribute('aria-label')).toBeNull();
    }
  });

  it('labels the group with the field name', () => {
    const group = fixture.nativeElement.querySelector('[role="group"]') as HTMLElement;

    expect(group.getAttribute('aria-label')).toBe('Aiuto per il campo Nome');
  });

  describe('Ripeti', () => {
    it('reads title and instruction locally', () => {
      click('Ripeti');

      expect(said()).toEqual(['Passo 1 di 3: Nome. Scrivi il tuo nome, poi premi Avanti.']);
      expect(orchestrator.assist).not.toHaveBeenCalled();
    });

    it('adds the active error', () => {
      fixture.componentRef.setInput('errorCodes', ['NAME_TOO_SHORT']);
      fixture.detectChanges();

      click('Ripeti');

      expect(said()).toEqual([
        'Passo 1 di 3: Nome. Scrivi il tuo nome, poi premi Avanti. ' +
          'Errore nel campo Nome: il nome deve avere almeno 2 lettere.',
      ]);
    });
  });

  describe('Spiega in altro modo', () => {
    it('reads a different explanation each time through the orchestrator', () => {
      click('Spiega in altro modo');
      click('Spiega in altro modo');

      expect(said()).toEqual([
        'Spiegazione 1 di 3: Scrivi come ti chiami.',
        'Spiegazione 2 di 3: In questo campo va il nome con cui vuoi essere chiamato.',
      ]);
    });

    it('sends the last help text as previousText, starting from the instruction', () => {
      click('Spiega in altro modo');
      click('Spiega in altro modo');

      expect(sentRequests().map((r) => (r.skill === 'rephrase' ? r.previousText : null))).toEqual([
        'Scrivi il tuo nome, poi premi Avanti.',
        'Spiegazione 1 di 3: Scrivi come ti chiami.',
      ]);
    });

    it('sends only field metadata', () => {
      click('Spiega in altro modo');

      expect(sentRequests()[0]).toEqual({
        skill: 'rephrase',
        field: {
          fieldId: 'name',
          label: 'Nome',
          purpose: 'Scrivi il tuo nome, poi premi Avanti.',
          rules: ['Almeno 2 lettere.'],
          step: 1,
          totalSteps: 3,
        },
        previousText: 'Scrivi il tuo nome, poi premi Avanti.',
      });
    });
  });

  it('Esempio reads the fictional example', () => {
    click('Esempio');

    expect(said()).toEqual([
      'Esempio: Anna Rossi. È solo un esempio, il campo non è stato modificato.',
    ]);
  });

  describe('Rileggi cosa ho scritto', () => {
    it('spells the value locally, without calling the orchestrator', () => {
      setField('email', 2);
      setValue('Anna_R-1@esempio.it');

      click('Rileggi cosa ho scritto');

      expect(said()).toEqual([
        'Hai scritto: Anna_R-1@esempio.it. Lettera per lettera: A maiuscola, n, n, a, trattino basso, ' +
          'R maiuscola, trattino, 1, chiocciola, e, s, e, m, p, i, o, punto, i, t.',
      ]);
      expect(orchestrator.assist).not.toHaveBeenCalled();
    });

    it('says the field is empty', () => {
      click('Rileggi cosa ho scritto');

      expect(said()).toEqual(['Il campo Nome è vuoto.']);
    });

    it('never lets the read-back reach the AI as previousText', () => {
      setValue('Anna Rossi');
      click('Rileggi cosa ho scritto');
      click('Spiega in altro modo');

      const payload = JSON.stringify(sentRequests());
      expect(payload).not.toContain('Anna Rossi');
      expect(payload).not.toContain('Hai scritto');
    });
  });

  describe('Rileggi on the password', () => {
    beforeEach(() => {
      setField('password', 3);
      setValue('Gira42');
    });

    function dialog(): HTMLElement | null {
      return fixture.nativeElement.querySelector('[role="alertdialog"]');
    }

    it('asks first and moves focus to the question, without reading the password', () => {
      click('Rileggi cosa ho scritto');

      const question = dialog()?.querySelector('p');
      expect(question?.textContent).toContain('Stai per sentire la password ad alta voce.');
      expect(document.activeElement).toBe(question);
      expect(said().join(' ')).not.toContain('G maiuscola');
    });

    it('in voice mode also speaks the question', () => {
      TestBed.inject(SpeechPreferencesStore).setMode('voice');

      click('Rileggi cosa ho scritto');

      expect(said()).toEqual([
        'Stai per sentire la password ad alta voce. Assicurati che nessuno possa ascoltare. Vuoi continuare?',
      ]);
    });

    it('"No" returns to the field in silence', () => {
      click('Rileggi cosa ho scritto');
      click('No, torna al campo');

      expect(dialog()).toBeNull();
      expect(narrator.stop).toHaveBeenCalled();
      expect(said()).toEqual([]);
      expect(focusRequests).toBe(1);
    });

    it('Esc works like "No"', () => {
      click('Rileggi cosa ho scritto');
      dialog()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(dialog()).toBeNull();
      expect(said()).toEqual([]);
      expect(focusRequests).toBe(1);
    });

    it('"Sì" spells the password, then returns to the field', () => {
      click('Rileggi cosa ho scritto');
      click('Sì, leggi la password');

      expect(said()).toEqual(['La password è: G maiuscola, i, r, a, 4, 2.']);
      expect(dialog()).toBeNull();
      expect(focusRequests).toBe(1);
    });

    it('the question disappears when the step changes', () => {
      click('Rileggi cosa ho scritto');
      setField('name');

      expect(dialog()).toBeNull();
    });

    it('never sends the password to the orchestrator', () => {
      click('Rileggi cosa ho scritto');
      click('Sì, leggi la password');
      click('Spiega in altro modo');
      click('Esempio');

      expect(JSON.stringify(sentRequests())).not.toContain('Gira42');
    });
  });

  describe('Fai una domanda a voce', () => {
    it('is disabled on the password field, with a visible reason', () => {
      setField('password', 3);

      const voice = button('Fai una domanda a voce');
      expect(voice.disabled).toBe(true);
      const reason = fixture.nativeElement.querySelector(`#${voice.getAttribute('aria-describedby')}`);
      expect(reason?.textContent).toContain('microfono è disattivato');

      voice.click();
      expect(recognition.listenOnce).not.toHaveBeenCalled();
    });

    it('stops listening when the step moves to the password', () => {
      click('Fai una domanda a voce');
      expect(recognition.active).toBe(true);

      setField('password', 3);

      expect(recognition.active).toBe(false);
    });

    it('is not rendered when the browser has no speech recognition', () => {
      TestBed.resetTestingModule();
      create(false);

      expect(buttons().map((b) => b.textContent?.trim())).not.toContain('Fai una domanda a voce');
    });

    it('silences the voice, then sends the question with the typed value removed', () => {
      setValue('Anna');
      click('Fai una domanda a voce');
      expect(narrator.stop).toHaveBeenCalled();

      recognition.session?.next('anna va bene come nome?');
      recognition.session?.complete();

      expect(sentRequests()).toEqual([
        expect.objectContaining({ skill: 'question', question: '[valore rimosso] va bene come nome?' }),
      ]);
    });

    it('acts on navigation intents', () => {
      click('Fai una domanda a voce');
      recognition.session?.next('vai avanti');

      expect(navigations).toEqual(['next']);
      expect(said()).toEqual([]);
    });

    it('reads the answer for other questions', () => {
      click('Fai una domanda a voce');
      recognition.session?.next('che tempo fa?');

      expect(said()).toHaveLength(1);
      expect(said()[0]).toContain('Scrivi il tuo nome, poi premi Avanti.');
    });

    it('says it did not hear anything when the session ends empty', () => {
      click('Fai una domanda a voce');
      recognition.session?.complete();

      expect(said()).toEqual(['Non ho sentito la domanda. Riprova, oppure usa i pulsanti.']);
    });

    it('a second press stops listening', () => {
      click('Fai una domanda a voce');
      click('Fai una domanda a voce');

      expect(recognition.active).toBe(false);
      expect(said()).toEqual([]);
    });
  });

  describe('pending answers', () => {
    let pending: Subject<AssistResponse>;

    beforeEach(() => {
      pending = new Subject<AssistResponse>();
      (orchestrator.assist as jest.Mock).mockReturnValue(pending);
    });

    it('are dropped when another command starts', () => {
      click('Esempio');
      click('Ripeti');
      pending.next({ text: 'Risposta tardiva.', source: 'ai' });

      expect(said()).not.toContain('Risposta tardiva.');
    });

    it('are dropped when the step changes', () => {
      click('Esempio');
      setField('email', 2);
      pending.next({ text: 'Risposta tardiva.', source: 'ai' });

      expect(said()).toEqual([]);
    });
  });
});
