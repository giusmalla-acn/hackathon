import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { FieldId } from '../../../../core/contracts';
import { REGISTRATION_FIELDS } from '../../data/registration-fields';
import type { RegistrationValues } from '../../data/registration.gateway';
import { expectNoAxeViolations, tabbables, tabName } from '../testing/a11y-helpers';
import { ReviewStepComponent } from './review-step.component';

@Component({
  standalone: true,
  imports: [ReviewStepComponent],
  template: `
    <main>
      <app-review-step
        [fields]="fields"
        [values]="values()"
        [submitting]="submitting()"
        [submitError]="submitError()"
        (edit)="edits.push($event)"
        (back)="backs = backs + 1"
        (confirm)="confirms = confirms + 1"
      />
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  readonly fields = REGISTRATION_FIELDS;
  readonly values = signal<RegistrationValues>({
    name: 'Anna Rossi',
    email: 'anna.rossi@esempio.it',
    password: 'Girasole42',
  });
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly edits: FieldId[] = [];
  backs = 0;
  confirms = 0;
}

describe('ReviewStepComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let el: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  const button = (name: string): HTMLButtonElement =>
    tabbables(el).find((node) => tabName(node) === name) as HTMLButtonElement;
  const row = (label: string): HTMLElement =>
    Array.from(el.querySelectorAll<HTMLElement>('.review__row')).find(
      (node) => node.querySelector('dt')?.textContent?.trim() === label,
    )!;

  it('renders the summary title as a programmatically focusable h1', () => {
    const h1 = el.querySelector('h1')!;
    expect(h1.textContent?.trim()).toBe('Riepilogo dei dati');
    expect(h1.getAttribute('tabindex')).toBe('-1');
  });

  it('shows the value of every field, with the password masked', () => {
    expect(row('Nome').querySelector('dd')!.textContent?.trim()).toBe('Anna Rossi');
    expect(row('Email').querySelector('dd')!.textContent?.trim()).toBe('anna.rossi@esempio.it');

    const password = row('Password').querySelector('dd')!;
    expect(password.textContent).toContain('••••••••');
    expect(password.textContent).toContain('10 caratteri');
    expect(el.textContent).not.toContain('Girasole42');
  });

  it('hides the mask from screen readers, which hear only the length (spec §1.8)', () => {
    const mask = Array.from(row('Password').querySelectorAll('span')).find(
      (node) => node.textContent === '••••••••',
    )!;
    expect(mask.getAttribute('aria-hidden')).toBe('true');
  });

  it('uses a fixed-length mask, whatever the password length', () => {
    host.values.update((values) => ({ ...values, password: 'abc12345678901234' }));
    fixture.detectChanges();
    expect(row('Password').textContent).toContain('••••••••');
    expect(row('Password').textContent).not.toContain('•••••••••');
  });

  it.each([
    ['Modifica nome', 'name'],
    ['Modifica email', 'email'],
    ['Modifica password', 'password'],
  ] as const)('"%s" asks to edit %s', (name, field) => {
    button(name).click();
    expect(host.edits).toEqual([field]);
  });

  it('tabs through Modifica, Indietro and Conferma registrazione in order', () => {
    expect(tabbables(el).map(tabName)).toEqual([
      'Modifica nome',
      'Modifica email',
      'Modifica password',
      'Indietro',
      'Conferma registrazione',
    ]);
  });

  it('emits back and confirm', () => {
    button('Indietro').click();
    button('Conferma registrazione').click();
    expect(host.backs).toBe(1);
    expect(host.confirms).toBe(1);
  });

  it('while submitting, keeps the button focusable but aria-disabled and ignores clicks', () => {
    host.submitting.set(true);
    fixture.detectChanges();

    const confirm = button('Conferma registrazione');
    expect(confirm.disabled).toBe(false);
    expect(confirm.getAttribute('aria-disabled')).toBe('true');
    confirm.click();
    expect(host.confirms).toBe(0);
  });

  it('links a failed submission message to the confirm button', async () => {
    host.submitError.set('Errore: non è stato possibile completare la registrazione.');
    fixture.detectChanges();

    const confirm = button('Conferma registrazione');
    const message = document.getElementById(confirm.getAttribute('aria-describedby')!)!;
    expect(message.textContent).toContain('Errore: non è stato possibile completare la registrazione.');
    await expectNoAxeViolations(el);
  });

  it('has no axe violations', async () => {
    await expectNoAxeViolations(el);
  });
});
