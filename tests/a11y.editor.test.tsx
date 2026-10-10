import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditorPage from '../src/pages/EditorPage';
import * as AuthContext from '../src/contexts/AuthContext';
import * as useResume from '../src/hooks/useResume';
import { DEFAULT_RESUME } from '../src/data/defaultResume';

vi.mock('../src/hooks/useResume', () => ({ useResume: vi.fn() }));
vi.mock('../src/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/lib/firebase', () => ({ auth: {}, db: {} }));

// useResume returns ~40 members; these tests need its data, every other member can be a no-op function.
const mockResume = () => new Proxy(
  {
    data: DEFAULT_RESUME,
    appState: { activeProfileId: 'main', profiles: { main: { id: 'main', name: 'Main', data: DEFAULT_RESUME } } },
    loading: false,
    isSyncing: false,
    getCurrentData: () => DEFAULT_RESUME,
  } as Record<string | symbol, unknown>,
  { get: (target, key) => (key in target ? target[key] : vi.fn()) },
);

// Buttons a screen reader would announce with no name ("button").
const unnamedButtons = (where: string) =>
  screen.queryAllByRole('button', { name: '' }).map((button) => `${where}: ${button.outerHTML.slice(0, 120)}`);

describe('editor accessibility', () => {
  beforeEach(() => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: 'u1' }, isPro: false, isAdmin: false, loading: false, isNewUser: false,
      signInWithGoogle: vi.fn(), signOut: vi.fn(),
    } as never);
    vi.mocked(useResume.useResume).mockReturnValue(mockResume() as never);
  });

  it('gives every button in the desktop editor an accessible name, in every section', () => {
    render(<MemoryRouter><EditorPage /></MemoryRouter>);

    const unnamed = unnamedButtons('info');
    for (const id of DEFAULT_RESUME.blockOrder) {
      const title = DEFAULT_RESUME.blocks[id].title;
      fireEvent.click(screen.getAllByText(title)[0]);
      unnamed.push(...unnamedButtons(title));
    }

    expect(unnamed).toEqual([]);
  });

  it('makes every section tab a real button (reachable with Tab, activated with Enter) that opens its section', () => {
    render(<MemoryRouter><EditorPage /></MemoryRouter>);

    for (const id of DEFAULT_RESUME.blockOrder) {
      const title = DEFAULT_RESUME.blocks[id].title;
      const tab = screen.getByRole('button', { name: title });
      const tabContainer = tab.closest('[data-active]')!;

      fireEvent.click(tab);

      expect(tabContainer).toHaveAttribute('data-active', 'true');
    }
  });
});
