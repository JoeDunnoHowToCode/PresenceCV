import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LogoutConfirmModal from '../src/components/LogoutConfirmModal';

describe('LogoutConfirmModal', () => {
  it('is a modal dialog labelled by its title', () => {
    render(<LogoutConfirmModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Confirm Logout' })).toHaveAttribute('aria-modal', 'true');
  });

  it('closes on Escape while open, and ignores Escape while closed', () => {
    const onClose = vi.fn();
    const { rerender } = render(<LogoutConfirmModal isOpen={false} onClose={onClose} onConfirm={vi.fn()} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    rerender(<LogoutConfirmModal isOpen onClose={onClose} onConfirm={vi.fn()} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves keyboard focus into the dialog when it opens', () => {
    render(<LogoutConfirmModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
  });
});
