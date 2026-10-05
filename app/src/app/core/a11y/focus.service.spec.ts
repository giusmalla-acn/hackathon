import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FocusService } from './focus.service';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 #title tabindex="-1">Passo 1 di 3: Nome</h1>`,
})
class HostComponent {
  readonly focus = inject(FocusService);
  readonly title = viewChild.required<ElementRef<HTMLElement>>('title');
}

describe('FocusService', () => {
  afterEach(() => document.body.replaceChildren());

  it('calls focus() on the given element', () => {
    const el = document.createElement('h1');
    const spy = jest.spyOn(el, 'focus');

    TestBed.inject(FocusService).focusStep(el);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('moves document focus to a step title injected through inject()', () => {
    const fixture = TestBed.createComponent(HostComponent);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    const title = fixture.componentInstance.title().nativeElement;

    fixture.componentInstance.focus.focusStep(title);

    expect(document.activeElement).toBe(title);
  });
});
