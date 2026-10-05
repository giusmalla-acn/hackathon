import { Injectable } from '@angular/core';

/** Gestione del focus all'ingresso di ogni passo (spec §1.6). Da usare con `inject(FocusService)`. */
@Injectable({ providedIn: 'root' })
export class FocusService {
  /** Sposta il focus sull'elemento, tipicamente il titolo `h1` del passo con `tabindex="-1"`. */
  focusStep(el: HTMLElement): void {
    el.focus();
  }
}
