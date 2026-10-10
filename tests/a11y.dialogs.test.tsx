import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditorPage from '../src/pages/EditorPage';
import * as AuthContext from '../src/contexts/AuthContext';
import * as useResume from '../src/hooks/useResume';
import { DEFAULT_RESUME } from '../src/data/defaultResume';

vi.mock('../src/hooks/useResume', () => ({ useResume: vi.fn() }));
vi.mock('../src/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/lib/firebase', () => ({ auth: {}, db: {} }));

// useResume returns ~40 members; these tests need its data, every other member can be a no-op function.
const mockResume = (overrides: Record<string, unknown> = {}) => new Proxy(
  {
    ...overrides,
    data: DEFAULT_RESUME,
    appState: { activeProfileId: 'main', profiles: { main: { id: 'main', name: 'Main', data: DEFAULT_RESUME } } },
    loading: false,
    isSyncing: false,
    getCurrentData: () => DEFAULT_RESUME,
  } as Record<string | symbol, unknown>,
  { get: (target, key) => (key in target ? target[key] : vi.fn()) },
);

// What every editor modal must be: a modal dialog named by its title, holding keyboard focus.
const expectFocusedModalDialog = (name: string) => {
  const dialog = screen.getByRole('dialog', { name });
  expect(dialog).toHaveAttribute('aria-modal', 'true');
  expect(dialog).toContainElement(document.activeElement as HTMLElement);
  return dialog;
};

describe('editor modals', () => {
  beforeEach(() => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: 'u1' }, isPro: false, isAdmin: false, loading: false, isNewUser: false,
      signInWithGoogle: vi.fn(), signOut: vi.fn(),
    } as never);
    vi.mocked(useResume.useResume).mockReturnValue(mockResume() as never);
  });

  it('opens Share as a labelled modal dialog that takes focus, names its close button, and closes on Escape', () => {
    render(<MemoryRouter><EditorPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    const dialog = expectFocusedModalDialog('Share Your Resume');
    expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks before deleting a section in a labelled modal dialog that takes focus; Escape cancels', () => {
    const removeBlock = vi.fn();
    vi.mocked(useResume.useResume).mockReturnValue(mockResume({ removeBlock }) as never);
    render(<MemoryRouter><EditorPage /></MemoryRouter>);
    const experienceTab = screen.getByRole('button', { name: 'Experience' }).closest('[data-active]') as HTMLElement;
    fireEvent.click(within(experienceTab).getByRole('button', { name: 'Delete Section' }));

    expectFocusedModalDialog('Delete Section?');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(removeBlock).not.toHaveBeenCalled();
  });
});
