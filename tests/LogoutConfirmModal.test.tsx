import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import LogoutConfirmModal from '../src/components/LogoutConfirmModal';

describe('LogoutConfirmModal', () => {
  it('is a modal dialog labelled by its title', () => {
    render(<LogoutConfirmModal isOpen onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Confirm Logout' })).toHaveAttribute('aria-modal', 'true');
  });
});
