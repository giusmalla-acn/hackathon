import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { expectNoAxeViolations } from '../testing/a11y-helpers';
import { CompletionComponent } from './completion.component';

@Component({
  standalone: true,
  imports: [CompletionComponent],
  template: `<main><app-completion [name]="name()" /></main>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  readonly name = signal('  Anna Rossi ');
}

describe('CompletionComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('renders "Registrazione completata" as a programmatically focusable h1', () => {
    const h1 = el.querySelector('h1')!;
    expect(h1.textContent?.trim()).toBe('Registrazione completata');
    expect(h1.getAttribute('tabindex')).toBe('-1');
  });

  it('thanks the user by the trimmed name', () => {
    expect(el.querySelector('p')!.textContent).toBe('Grazie, Anna Rossi. Il tuo account è stato creato.');
  });

  it('has no axe violations', async () => {
    await expectNoAxeViolations(el);
  });
});
