import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideAssist } from '../../../../core/assist';

import { Narrator } from '../../../../core/contracts';
import { NarrationService } from '../../../../core/narration';
import { REGISTRATION_FIELDS } from '../../data/registration-fields';
import { RegistrationGateway } from '../../data/registration.gateway';
import { expectNoAxeViolations, tabbables, tabName } from '../testing/a11y-helpers';
import { RegistrationWizardComponent } from './registration-wizard.component';

type NarratorStub = { [K in keyof Narrator]: jest.Mock };

describe('RegistrationWizardComponent', () => {
  let fixture: ComponentFixture<RegistrationWizardComponent>;
  let el: HTMLElement;
  let narrator: NarratorStub;
  let register: jest.Mock;

  beforeEach(async () => {
    localStorage.clear();
    narrator = { say: jest.fn(), stop: jest.fn(), repeatLast: jest.fn() };
    register = jest.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [RegistrationWizardComponent],
      providers: [
        { provide: NarrationService, useValue: narrator },
        { provide: Narrator, useExisting: NarrationService },
        { provide: RegistrationGateway, useValue: { register } },
        provideAssist(REGISTRATION_FIELDS),
      ],
    });
    fixture = TestBed.createComponent(RegistrationWizardComponent);
    el = fixture.nativeElement as HTMLElement;
    await render();
  });

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  /** Raggiunge il pulsante con Tab (deve essere tabulabile) e lo attiva come farebbero Invio o Spazio. */
  async function press(name: string): Promise<void> {
    const button = tabbables(el).find((node) => node.tagName === 'BUTTON' && tabName(node) === name);
    if (!button) {
      throw new Error(`Nessun pulsante tabulabile "${name}" in: ${tabbables(el).map(tabName).join(', ')}`);
    }
    button.focus();
    button.click();
    await render();
  }

  async function type(text: string): Promise<void> {
    const input = field();
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await render();
  }

  const field = (): HTMLInputElement => el.querySelector('input:not([type="radio"])')!;
  const title = (): HTMLElement => el.querySelector('h1')!;
  const progress = (): string => el.querySelector('[aria-live="polite"]')!.textContent!.trim();
  const lastSaid = (): [string, string?] => narrator.say.mock.calls.at(-1) as [string, string?];

  function expectFocusOnTitle(text: string): void {
    expect(title().textContent?.trim()).toBe(text);
    expect(document.activeElement).toBe(title());
  }

  it('starts on the welcome screen with the voice settings and an Inizia button', async () => {
    expect(title().textContent?.trim()).toBe('Registrazione guidata');
    expect(el.querySelector('app-voice-settings')).not.toBeNull();
    expect(tabbables(el).map(tabName).at(-1)).toBe('Inizia');
    expect(progress()).toBe('');
    await expectNoAxeViolations(el);
  });

  it('completes the happy path with the keyboard only, without AI', async () => {
    await press('Inizia');
    expectFocusOnTitle('Passo 1 di 3: Nome');
    expect(progress()).toBe('Passo 1 di 3');
    expect(lastSaid()[0]).toBe(
      'Modalità screen reader attiva. Gli annunci saranno letti dal tuo screen reader. Scrivi il tuo nome, poi premi Avanti.',
    );
    await expectNoAxeViolations(el);

    await type('Anna Rossi');
    await press('Avanti');
    expectFocusOnTitle('Passo 2 di 3: Email');
    expect(progress()).toBe('Passo 2 di 3');
    expect(lastSaid()).toEqual(['Scrivi il tuo indirizzo email, poi premi Avanti.']);

    await type('anna.rossi@esempio.it');
    await press('Avanti');
    expectFocusOnTitle('Passo 3 di 3: Password');
    expect(field().type).toBe('password');

    await type('Girasole42');
    await press('Avanti');
    expectFocusOnTitle('Riepilogo dei dati');
    expect(progress()).toBe('');
    expect(lastSaid()[0]).toBe(
      'Controlla i tuoi dati. Nome: Anna Rossi. Email: anna.rossi@esempio.it. Password: inserita, 10 caratteri, non letta. ' +
        'Per correggere un dato premi Modifica accanto al dato. Per completare premi Conferma registrazione.',
    );
    expect(el.textContent).toContain('anna.rossi@esempio.it');
    expect(el.textContent).not.toContain('Girasole42');
    expect(tabbables(el).map(tabName)).toEqual([
      'Modifica nome',
      'Modifica email',
      'Modifica password',
      'Indietro',
      'Conferma registrazione',
    ]);
    await expectNoAxeViolations(el);

    await press('Conferma registrazione');
    await render();
    expect(register).toHaveBeenCalledWith({ name: 'Anna Rossi', email: 'anna.rossi@esempio.it', password: 'Girasole42' });
    expectFocusOnTitle('Registrazione completata');
    expect(lastSaid()).toEqual(['Registrazione completata, Anna Rossi. Il tuo account è stato creato.']);
    await expectNoAxeViolations(el);

    // E2-7: in storage solo le preferenze di lettura, mai i valori del form.
    expect(Object.keys(localStorage).filter((key) => key !== 'a11y-prefs')).toEqual([]);
    expect(sessionStorage.length).toBe(0);
    for (const value of ['Anna Rossi', 'anna.rossi@esempio.it', 'Girasole42']) {
      expect(localStorage.getItem('a11y-prefs') ?? '').not.toContain(value);
    }
  });

  it('keeps the field order: input, assist panel, Indietro, Avanti', async () => {
    await press('Inizia');
    expect(tabbables(el).map(tabName)).toEqual([
      'INPUT',
      'Ripeti',
      'Spiega in altro modo',
      'Esempio',
      'Rileggi cosa ho scritto',
      'Indietro',
      'Avanti',
    ]);
    expect(el.querySelector('app-field-step app-assist-panel')).not.toBeNull();
  });

  it('answers the assist buttons with the static texts, without AI', async () => {
    await press('Inizia');
    await type('Anna');

    await press('Ripeti');
    expect(lastSaid()).toEqual(['Passo 1 di 3: Nome. Scrivi il tuo nome, poi premi Avanti.']);

    await press('Spiega in altro modo');
    expect(lastSaid()).toEqual(['Spiegazione 1 di 3: Scrivi come ti chiami.']);

    await press('Esempio');
    expect(lastSaid()).toEqual(['Esempio: Anna Rossi. È solo un esempio, il campo non è stato modificato.']);
    expect(field().value).toBe('Anna');

    await press('Rileggi cosa ho scritto');
    expect(lastSaid()).toEqual(['Hai scritto: Anna. Lettera per lettera: A maiuscola, n, n, a.']);
  });

  it('repeats the active error with Ripeti', async () => {
    await press('Inizia');
    await press('Avanti');
    await press('Ripeti');
    expect(lastSaid()[0]).toBe(
      'Passo 1 di 3: Nome. Scrivi il tuo nome, poi premi Avanti. Errore nel campo Nome: il nome è vuoto. Scrivi il tuo nome, poi premi Avanti.',
    );
  });

  it('returns the focus to the password field when its read-back is cancelled', async () => {
    await press('Inizia');
    await type('Anna');
    await press('Avanti');
    await type('anna@esempio.it');
    await press('Avanti');
    await type('Girasole42');
    narrator.say.mockClear();

    await press('Rileggi cosa ho scritto');
    expect(el.querySelector('[role="alertdialog"]')).not.toBeNull();
    await press('No, torna al campo');

    expect(document.activeElement).toBe(field());
    expect(narrator.say.mock.calls.flat().join(' ')).not.toContain('Girasole42');
  });

  it('submits the step with Enter in the field', async () => {
    await press('Inizia');
    await type('Anna');
    field().form!.requestSubmit();
    await render();
    expectFocusOnTitle('Passo 2 di 3: Email');
  });

  it('does not validate while typing', async () => {
    await press('Inizia');
    await type('A1');
    expect(field().hasAttribute('aria-invalid')).toBe(false);
    expect(narrator.say).not.toHaveBeenCalledWith(expect.anything(), 'assertive');
  });

  it('on Avanti with an error stays on the step, focuses the invalid field and announces assertively', async () => {
    await press('Inizia');
    await type('Anna');
    await press('Avanti');
    await type('anna.rossi.esempio.it');
    await press('Avanti');

    expect(title().textContent?.trim()).toBe('Passo 2 di 3: Email');
    expect(document.activeElement).toBe(field());
    expect(field().getAttribute('aria-invalid')).toBe('true');
    expect(lastSaid()).toEqual([
      "Errore nel campo Email: manca la chiocciola. Un'email ha la forma nome chiocciola dominio, per esempio anna punto rossi chiocciola esempio punto it.",
      'assertive',
    ]);
    await expectNoAxeViolations(el);
  });

  describe('E2-3: weak password', () => {
    beforeEach(async () => {
      await press('Inizia');
      await type('Anna');
      await press('Avanti');
      await type('anna@esempio.it');
      await press('Avanti');
    });

    it('(a) "abc": counts the errors, reads PASSWORD_TOO_SHORT with the length, focuses the field', async () => {
      await type('abc');
      await press('Avanti');

      expect(title().textContent?.trim()).toBe('Passo 3 di 3: Password');
      expect(document.activeElement).toBe(field());
      expect(field().getAttribute('aria-invalid')).toBe('true');
      expect(lastSaid()).toEqual([
        '2 errori trovati. Errore nel campo Password: la password è troppo corta: hai scritto 3 caratteri, ne servono almeno 8.',
        'assertive',
      ]);
      expect(el.querySelector('.field__error')!.textContent).toContain('2 errori trovati nel campo Password:');
      await expectNoAxeViolations(el);
    });

    it('(b) "abcdefgh": reads PASSWORD_WEAK "aggiungi un numero"', async () => {
      await type('abcdefgh');
      await press('Avanti');

      expect(document.activeElement).toBe(field());
      expect(field().getAttribute('aria-invalid')).toBe('true');
      expect(lastSaid()).toEqual(['Errore nel campo Password: la password è debole: aggiungi un numero.', 'assertive']);
    });

    it('never reads the password', async () => {
      await type('abc');
      await press('Avanti');
      await type('abcdefgh');
      await press('Avanti');

      const said = narrator.say.mock.calls.map(([text]) => text as string);
      expect(said.some((text) => text.includes('abc'))).toBe(false);
    });

    it('does not announce anything while the user corrects the field', async () => {
      await type('abc');
      await press('Avanti');
      narrator.say.mockClear();

      await type('abcd');
      await type('abcd1');
      expect(narrator.say).not.toHaveBeenCalled();
      expect(el.querySelector('.field__error')!.textContent).toContain('hai scritto 3 caratteri');

      await type('abcdefg1');
      await press('Avanti');
      expectFocusOnTitle('Riepilogo dei dati');
      expect(narrator.say).not.toHaveBeenCalledWith(expect.anything(), 'assertive');
    });
  });

  it('reads a single error without the count', async () => {
    await press('Inizia');
    await press('Avanti');
    expect(lastSaid()).toEqual([
      'Errore nel campo Nome: il nome è vuoto. Scrivi il tuo nome, poi premi Avanti.',
      'assertive',
    ]);
  });

  it('returning to a field that had an error announces the step, not the old error', async () => {
    await press('Inizia');
    await type('Anna');
    await press('Avanti');
    await type('anna');
    await press('Avanti');
    expect(field().getAttribute('aria-invalid')).toBe('true');

    await press('Indietro');
    await press('Avanti');

    expectFocusOnTitle('Passo 2 di 3: Email');
    expect(lastSaid()).toEqual(['Scrivi il tuo indirizzo email, poi premi Avanti.']);
    expect(field().hasAttribute('aria-invalid')).toBe(false);
    expect(el.textContent).not.toContain('Errore nel campo');
  });

  it('after Modifica, Indietro returns to the normal order', async () => {
    await press('Inizia');
    await type('Anna');
    await press('Avanti');
    await type('anna@esempio.it');
    await press('Avanti');
    await type('Girasole42');
    await press('Avanti');

    await press('Modifica email');
    await press('Indietro');
    expectFocusOnTitle('Passo 1 di 3: Nome');
    await press('Avanti');
    expectFocusOnTitle('Passo 2 di 3: Email');
  });

  it('announces a failed registration and keeps the user on the summary', async () => {
    register.mockImplementationOnce(async () => {
      throw new Error('rete');
    });
    await press('Inizia');
    await type('Anna');
    await press('Avanti');
    await type('anna@esempio.it');
    await press('Avanti');
    await type('Girasole42');
    await press('Avanti');

    await press('Conferma registrazione');
    await render();

    const message =
      'Errore: non è stato possibile completare la registrazione. I tuoi dati sono ancora qui. Riprova premendo Conferma registrazione.';
    expect(title().textContent?.trim()).toBe('Riepilogo dei dati');
    expect(lastSaid()).toEqual([message, 'assertive']);
    const confirm = tabbables(el).find((node) => tabName(node) === 'Conferma registrazione')!;
    expect(document.activeElement).toBe(confirm);
    expect(document.getElementById(confirm.getAttribute('aria-describedby')!)?.textContent?.trim()).toContain(message);
    await expectNoAxeViolations(el);

    await press('Conferma registrazione');
    await render();
    expectFocusOnTitle('Registrazione completata');
  });

  it('goes back keeping values and focusing the title, up to the welcome screen', async () => {
    await press('Inizia');
    await type('Anna');
    await press('Avanti');
    await press('Indietro');

    expectFocusOnTitle('Passo 1 di 3: Nome');
    expect(field().value).toBe('Anna');

    await press('Indietro');
    expectFocusOnTitle('Registrazione guidata');
  });

  it('returns to the summary after editing a field', async () => {
    await press('Inizia');
    await type('Anna');
    await press('Avanti');
    await type('anna@esempio.it');
    await press('Avanti');
    await type('Girasole42');
    await press('Avanti');

    await press('Modifica email');
    expectFocusOnTitle('Passo 2 di 3: Email');
    expect(field().value).toBe('anna@esempio.it');

    await type('anna.rossi@esempio.it');
    await press('Avanti');
    expectFocusOnTitle('Riepilogo dei dati');
    expect(lastSaid()[0]).toContain('Email: anna.rossi@esempio.it.');
  });

  it.each([
    ['Modifica nome', 'Passo 1 di 3: Nome', 'Anna'],
    ['Modifica email', 'Passo 2 di 3: Email', 'anna@esempio.it'],
    ['Modifica password', 'Passo 3 di 3: Password', 'Girasole42'],
  ])('"%s" goes to the right step, with its value and the focus on the title', async (button, heading, value) => {
    await press('Inizia');
    await type('Anna');
    await press('Avanti');
    await type('anna@esempio.it');
    await press('Avanti');
    await type('Girasole42');
    await press('Avanti');

    await press(button);
    expectFocusOnTitle(heading);
    expect(field().value).toBe(value);

    await press('Avanti');
    expectFocusOnTitle('Riepilogo dei dati');
  });

  it('E2-8: Indietro and Modifica keep the values and return to the summary', async () => {
    await press('Inizia');
    await type('Anna');
    await press('Avanti');
    await type('anna@esempio.it');
    await press('Avanti');
    await type('Girasole42');

    // 1. Indietro due volte dal Passo 3: valori conservati, focus sul titolo a ogni passo.
    await press('Indietro');
    expectFocusOnTitle('Passo 2 di 3: Email');
    expect(field().value).toBe('anna@esempio.it');
    await press('Indietro');
    expectFocusOnTitle('Passo 1 di 3: Nome');
    expect(field().value).toBe('Anna');

    // 2. Di nuovo avanti fino al riepilogo.
    await press('Avanti');
    await press('Avanti');
    expectFocusOnTitle('Passo 3 di 3: Password');
    expect(field().value).toBe('Girasole42');
    await press('Avanti');
    expectFocusOnTitle('Riepilogo dei dati');

    // 3. Modifica email: focus sul titolo del Passo 2; Avanti torna al riepilogo con la nuova email.
    await press('Modifica email');
    expectFocusOnTitle('Passo 2 di 3: Email');
    await type('anna.rossi@esempio.it');
    await press('Avanti');
    expectFocusOnTitle('Riepilogo dei dati');
    expect(lastSaid()[0]).toContain('Email: anna.rossi@esempio.it.');
    expect(el.textContent).toContain('anna.rossi@esempio.it');
  });

  it('includes the step title in the announcement in voice mode', async () => {
    (el.querySelector<HTMLInputElement>('input[type="radio"][value="voice"]')!).click();
    await render();
    await press('Inizia');

    expect(lastSaid()[0]).toMatch(/^Modalità voce integrata attiva\..* Passo 1 di 3: Nome\. Scrivi il tuo nome, poi premi Avanti\.$/);
    expect(Object.keys(localStorage)).toEqual(['a11y-prefs']);
  });

  it('stops the narration on Esc and while typing', async () => {
    await press('Inizia');
    narrator.stop.mockClear();

    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(narrator.stop).toHaveBeenCalledTimes(1);

    await type('A');
    expect(narrator.stop).toHaveBeenCalledTimes(2);
  });
});
