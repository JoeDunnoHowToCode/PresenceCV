import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useModalDialog } from '../src/hooks/useModalDialog';

function Modal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ref, titleId } = useModalDialog(open, onClose);
  if (!open) return null;
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <h3 id={titleId}>Delete Section?</h3>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}

describe('useModalDialog', () => {
  it('labels the dialog, takes focus, and closes on Escape only while open', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Modal open={false} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    rerender(<Modal open onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Delete Section?' })).toContainElement(document.activeElement as HTMLElement);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
