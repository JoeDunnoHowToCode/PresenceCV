// What a modal panel needs besides its markup: a title id, Escape to close, and focus kept inside.
import { useEffect, useId, useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';

export function useModalDialog<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const titleId = useId();
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

  return { ref, titleId };
}
