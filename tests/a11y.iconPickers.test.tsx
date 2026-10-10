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
    data: DEFAULT_RESUME,
    appState: { activeProfileId: 'main', profiles: { main: { id: 'main', name: 'Main', data: DEFAULT_RESUME } } },
    loading: false,
    isSyncing: false,
    getCurrentData: () => DEFAULT_RESUME,
    ...overrides,
  } as Record<string | symbol, unknown>,
  { get: (target, key) => (key in target ? target[key] : vi.fn()) },
);

// The test i18n mock returns templates without interpolating, so names are matched by their start.
const CHOOSE_SECTION_ICON = /^Choose an icon for the/;

describe('icon pickers, from the keyboard', () => {
  beforeEach(() => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { uid: 'u1' }, isPro: false, isAdmin: false, loading: false, isNewUser: false,
      signInWithGoogle: vi.fn(), signOut: vi.fn(),
    } as never);
  });

  it('desktop section icon: a named button opens a picker that takes focus, Escape closes it and refocuses the button, and a named option picks', () => {
    const updateBlockIcon = vi.fn();
    vi.mocked(useResume.useResume).mockReturnValue(mockResume({ updateBlockIcon }) as never);
    render(<MemoryRouter><EditorPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Experience' }));

    const trigger = screen.getByRole('button', { name: CHOOSE_SECTION_ICON });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    trigger.focus();
    fireEvent.click(trigger); // what Enter or Space does on a focused button
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const picker = screen.getByRole('dialog', { name: CHOOSE_SECTION_ICON });
    expect(picker).toContainElement(document.activeElement as HTMLElement);
    expect(within(picker).getByRole('button', { name: 'No icon' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Star' }));
    expect(updateBlockIcon).toHaveBeenCalledWith('experience', 'Star');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mobile section icon: the same, from the section header', () => {
    const updateBlockIcon = vi.fn();
    vi.mocked(useResume.useResume).mockReturnValue(mockResume({ updateBlockIcon }) as never);
    const desktopWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 375 });
    try {
      render(<MemoryRouter><EditorPage /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: 'Choose a section' }));
      fireEvent.click(screen.getByRole('button', { name: 'Experience' }));

      const trigger = screen.getByRole('button', { name: CHOOSE_SECTION_ICON });
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      trigger.focus();
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const picker = screen.getByRole('dialog', { name: CHOOSE_SECTION_ICON });
      expect(picker).toContainElement(document.activeElement as HTMLElement);
      expect(within(picker).getByRole('button', { name: 'No icon' })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();

      fireEvent.click(trigger);
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Star' }));
      expect(updateBlockIcon).toHaveBeenCalledWith('experience', 'Star');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: desktopWidth });
    }
  });
});
