import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the skip link as the first focusable element, pointing to #main', () => {
    const host = render();
    const skipLink = host.querySelector<HTMLAnchorElement>('a.skip-link');

    expect(skipLink).not.toBeNull();
    expect(skipLink?.textContent?.trim()).toBe('Vai al contenuto');
    expect(skipLink?.getAttribute('href')).toBe('#main');
    expect(host.querySelector('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')).toBe(
      skipLink,
    );
  });

  it('renders a programmatically focusable <main id="main"> hosting the router outlet', () => {
    const host = render();
    const main = host.querySelector<HTMLElement>('main');

    expect(main).not.toBeNull();
    expect(main?.id).toBe('main');
    expect(main?.getAttribute('tabindex')).toBe('-1');
    expect(main?.querySelector('router-outlet')).not.toBeNull();
  });

  it('moves focus to <main> when the skip link is activated', () => {
    const host = render();
    const skipLink = host.querySelector<HTMLAnchorElement>('a.skip-link')!;
    const main = host.querySelector<HTMLElement>('main')!;

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    skipLink.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(main);
  });
});
