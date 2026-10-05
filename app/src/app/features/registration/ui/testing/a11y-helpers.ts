import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]';

/**
 * Elementi raggiungibili con Tab, nell'ordine in cui il browser li visita.
 * jsdom non simula Tab: in assenza di tabindex positivi l'ordine è quello del DOM.
 */
export function tabbables(root: HTMLElement): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
  const positive = nodes.filter((node) => node.tabIndex > 0);
  if (positive.length > 0) {
    throw new Error('tabindex positivo: altera l\'ordine di tabulazione');
  }
  return nodes.filter((node) => node.tabIndex === 0 && !node.closest('[hidden], [inert]'));
}

/** Nome leggibile di un elemento tabulabile, per confrontare l'ordine nei test. */
export function tabName(node: HTMLElement): string {
  return node.getAttribute('aria-label') ?? (node.textContent?.trim() || node.tagName);
}

export async function expectNoAxeViolations(root: HTMLElement): Promise<void> {
  expect(await axe(root)).toHaveNoViolations();
}
