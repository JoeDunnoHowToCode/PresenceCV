import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../src/pages/HomePage';
import * as AuthContext from '../src/contexts/AuthContext';

vi.mock('../src/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/lib/firebase', () => ({ auth: {}, db: {} }));

describe('home page accessibility', () => {
  beforeEach(() => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: null, isPro: false, isAdmin: false, loading: false, isNewUser: false,
      signInWithGoogle: vi.fn(), signOut: vi.fn(),
    } as never);
  });

  it('gives every button an accessible name', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);

    const unnamed = screen.queryAllByRole('button', { name: '' }).map((button) => button.outerHTML.slice(0, 120));

    expect(unnamed).toEqual([]);
  });
});
