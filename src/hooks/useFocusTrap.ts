// Keeps keyboard focus inside a modal or popover while it is open.
import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const container = ref.current;
    if (!active || !container) return;
    const focusables = (): HTMLElement[] => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    (focusables()[0] ?? container).focus();

    // The browser moves focus between the controls; we only wrap it at the two ends.
    const wrapTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', wrapTab);
    return () => document.removeEventListener('keydown', wrapTab);
  }, [ref, active]);
}
