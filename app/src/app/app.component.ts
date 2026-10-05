import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  /**
   * With `<base href="/">` a plain `href="#main"` resolves to `/#main` and would
   * navigate away from the current route, so we move focus programmatically.
   */
  skipToMain(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
