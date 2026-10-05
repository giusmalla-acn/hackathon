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

  function show(id: 'name' | 'email' | 'password', errors: readonly ValidationErrorCode[] = []): void {
    host.field.set(getFieldDefinition(id));
    host.step.set(['name', 'email', 'password'].indexOf(id) + 1);
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
    show('email', ['EMAIL_MISSING_AT', 'EMAIL_INVALID_DOMAIN']);

    const error = el.querySelector<HTMLElement>(`#${input().getAttribute('aria-errormessage')}`)!;
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(error.textContent?.trim()).toContain('Errore nel campo Email: manca la chiocciola.');
    expect(describedBy()[0]).toBe(error);
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
    ] as const)('has no violations for %s with errors %j', async (id, errors) => {
      show(id, errors);
      await expectNoAxeViolations(el);
    });
  });
});
