import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../src/pages/HomePage';
import { useAuth } from '../src/contexts/AuthContext';

vi.mock('../src/contexts/AuthContext', () => ({ useAuth: vi.fn() }));

const renderHome = () => render(<MemoryRouter><HomePage /></MemoryRouter>);

describe('HomePage content only promises what exists', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: null, signInWithGoogle: vi.fn(), signOut: vi.fn() } as never);
  });

  it('has no pricing section and no Pricing link (desktop nav or mobile menu)', () => {
    const { container } = renderHome();
    const mobileToggle = container.querySelector('nav button.md\\:hidden');
    if (mobileToggle) fireEvent.click(mobileToggle);

    expect(container.querySelector('#pricing')).toBeNull();
    expect(container.querySelector('a[href="#pricing"]')).toBeNull();
    expect(screen.queryByText('Pricing')).not.toBeInTheDocument();
  });
});
