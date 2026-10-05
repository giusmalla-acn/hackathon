import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import type { FieldDefinition, ValidationErrorCode } from '../../../../core/contracts';
import { getFieldDefinition } from '../../data/registration-fields';
import { expectNoAxeViolations, tabbables, tabName } from '../testing/a11y-helpers';
import { FieldStepComponent } from './field-step.component';

@Component({
  standalone: true,
  imports: [FieldStepComponent],
  template: `
    <main>
      <app-field-step
        [field]="field()"
        [value]="value()"
        [errors]="errors()"
        [step]="step()"
        [totalSteps]="3"
        (valueChange)="changes.push($event)"
      >
        <button type="button">Ripeti</button>
      </app-field-step>
      <button type="button">Avanti</button>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  readonly field = signal<FieldDefinition>(getFieldDefinition('name'));
  readonly value = signal('');
  readonly errors = signal<readonly ValidationErrorCode[]>([]);
  readonly step = signal(1);
  readonly changes: string[] = [];
}

describe('FieldStepComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  function show(
    id: 'name' | 'email' | 'password',
    errors: readonly ValidationErrorCode[] = [],
    value = '',
  ): void {
    host.field.set(getFieldDefinition(id));
    host.step.set(['name', 'email', 'password'].indexOf(id) + 1);
    host.value.set(value);
    host.errors.set(errors);
    fixture.detectChanges();
  }

  const input = (): HTMLInputElement => el.querySelector('input')!;
  const toggle = (): HTMLButtonElement | null => el.querySelector('button.field__toggle');
  const describedBy = (): HTMLElement[] =>
    input()
      .getAttribute('aria-describedby')!
      .split(' ')
      .map((id) => el.querySelector<HTMLElement>(`#${id}`)!);

  it('renders the step title as a programmatically focusable h1', () => {
    const h1 = el.querySelector('h1')!;
    expect(h1.textContent?.trim()).toBe('Passo 1 di 3: Nome');
    expect(h1.getAttribute('tabindex')).toBe('-1');
  });

  it('links the label to the input', () => {
    const label = el.querySelector('label')!;
    expect(label.htmlFor).toBe(input().id);
    expect(label.textContent?.trim()).toBe('Nome');
  });

  it('describes the input with the instruction and the rules', () => {
    const texts = describedBy().map((node) => node.textContent ?? '');
    expect(texts[0]).toContain('Scrivi il tuo nome, poi premi Avanti.');
    expect(texts[1]).toContain('Almeno 2 lettere.');
  });

  it.each([
    ['name', 'text', 'name'],
    ['email', 'email', 'email'],
    ['password', 'password', 'new-password'],
  ] as const)('uses type and autocomplete suited to %s', (id, type, autocomplete) => {
    show(id);
    expect(input().type).toBe(type);
    expect(input().getAttribute('autocomplete')).toBe(autocomplete);
  });

  it('has no aria-invalid or error message without errors', () => {
    expect(input().hasAttribute('aria-invalid')).toBe(false);
    expect(input().hasAttribute('aria-errormessage')).toBe(false);
    expect(el.querySelector('.field__error')).toBeNull();
  });

  it('sets aria-invalid and points aria-errormessage and aria-describedby at the visible error', () => {
    show('email', ['EMAIL_MISSING_AT'], 'anna.rossi.esempio.it');

    const error = el.querySelector<HTMLElement>(`#${input().getAttribute('aria-errormessage')}`)!;
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(error.textContent?.trim()).toContain('Errore nel campo Email: manca la chiocciola.');
    expect(describedBy()[0]).toBe(error);
  });

  it('marks the error with a text icon, not only with colour', () => {
    show('email', ['EMAIL_MISSING_AT']);
    const icon = el.querySelector('.field__error .field__error-icon')!;
    expect(icon.textContent).toBe('!');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  it('with more errors shows the count and every message, all linked to the input', () => {
    show('password', ['PASSWORD_TOO_SHORT', 'PASSWORD_MISSING_DIGIT'], 'abc');

    const error = describedBy()[0];
    expect(error.id).toBe(input().getAttribute('aria-errormessage'));
    expect(error.querySelector('p')!.textContent?.trim()).toBe('2 errori trovati nel campo Password:');
    expect(Array.from(error.querySelectorAll('li')).map((li) => li.textContent?.trim())).toEqual([
      'la password è troppo corta: hai scritto 3 caratteri, ne servono almeno 8.',
      'la password è debole: aggiungi un numero.',
    ]);
  });

  it('never shows the password itself in the error', () => {
    show('password', ['PASSWORD_TOO_SHORT', 'PASSWORD_MISSING_DIGIT'], 'abc');
    expect(el.querySelector('.field__error')!.textContent).not.toContain('abc');
  });

  it('keeps the message of the last validation while the user types', () => {
    show('password', ['PASSWORD_TOO_SHORT'], 'abc1');
    host.value.set('abc12');
    fixture.detectChanges();

    expect(el.querySelector('.field__error')!.textContent).toContain('hai scritto 4 caratteri');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('emits typed values without validating them', () => {
    input().value = 'A1';
    input().dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(host.changes).toEqual(['A1']);
    expect(input().hasAttribute('aria-invalid')).toBe(false);
    expect(el.querySelector('.field__error')).toBeNull();
  });

  describe('password visibility', () => {
    beforeEach(() => show('password'));

    it('shows a toggle only for the password', () => {
      expect(toggle()).not.toBeNull();
      show('email');
      expect(toggle()).toBeNull();
    });

    it('switches the input type and the accessible name of the toggle', () => {
      expect(toggle()!.getAttribute('aria-label')).toBe('Mostra password');

      toggle()!.click();
      fixture.detectChanges();
      expect(input().type).toBe('text');
      expect(toggle()!.getAttribute('aria-label')).toBe('Nascondi password');
      expect(toggle()!.textContent?.trim()).toBe('Nascondi password');

      toggle()!.click();
      fixture.detectChanges();
      expect(input().type).toBe('password');
      expect(toggle()!.getAttribute('aria-label')).toBe('Mostra password');
    });

    it('hides the password again when the field changes', () => {
      toggle()!.click();
      show('email');
      show('password');
      expect(input().type).toBe('password');
    });
  });

  describe('keyboard', () => {
    it('tabs through input, projected assist panel, then the host buttons', () => {
      expect(tabbables(el).map(tabName)).toEqual([
        'INPUT',
        'Ripeti',
        'Avanti',
      ]);
    });

    it('puts the password toggle right after the input', () => {
      show('password');
      expect(tabbables(el).map(tabName)).toEqual([
        'INPUT',
        'Mostra password',
        'Ripeti',
        'Avanti',
      ]);
    });

    it('focuses the input on request', () => {
      fixture.debugElement.query(By.directive(FieldStepComponent)).componentInstance.focusInput();
      expect(document.activeElement).toBe(input());
    });
  });

  describe('axe', () => {
    it.each([
      ['name', []],
      ['email', ['EMAIL_MISSING_AT']],
      ['password', []],
      ['password', ['PASSWORD_TOO_SHORT']],
      ['password', ['PASSWORD_TOO_SHORT', 'PASSWORD_MISSING_DIGIT']],
    ] as const)('has no violations for %s with errors %j', async (id, errors) => {
      show(id, errors);
      await expectNoAxeViolations(el);
    });
  });
});
