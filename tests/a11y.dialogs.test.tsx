import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
// These tests have no Firestore: stub the calls the Share dialog can make while it renders
// (subscribing to the owner's shared-links list), so opening it doesn't throw.
vi.mock('firebase/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/firestore')>()),
  collection: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
}));

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

  it('gives keyboard focus back to the Share button when Share closes', () => {
    render(<MemoryRouter><EditorPage /></MemoryRouter>);
    const shareButton = screen.getByRole('button', { name: 'Share' });
    shareButton.focus();
    fireEvent.click(shareButton); // what Enter does on the focused button

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(shareButton).toHaveFocus();
  });

  // Opening Share blurs a focused text field so its debounced edit is saved before the snapshot is taken.
  it('has saved the latest edit of a focused text field once Share opens', () => {
    const updateProfile = vi.fn();
    vi.mocked(useResume.useResume).mockReturnValue(mockResume({ updateProfile }) as never);
    render(<MemoryRouter><EditorPage /></MemoryRouter>);
    const nameField = screen.getByDisplayValue(DEFAULT_RESUME.profile.name);
    nameField.focus();
    fireEvent.change(nameField, { target: { value: 'Alex R.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    expect(nameField).not.toHaveFocus();
    expect(updateProfile).toHaveBeenLastCalledWith('name', 'Alex R.');
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

  it('asks before deleting a resume in a labelled modal dialog that takes focus; Escape cancels', () => {
    const deleteProfile = vi.fn();
    vi.mocked(useResume.useResume).mockReturnValue(mockResume({
      deleteProfile,
      appState: {
        activeProfileId: 'main',
        profiles: {
          main: { id: 'main', name: 'Main', data: DEFAULT_RESUME },
          design: { id: 'design', name: 'Design CV', data: DEFAULT_RESUME },
        },
      },
    }) as never);
    render(<MemoryRouter><EditorPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Main' })); // open the profile switcher
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Profile' })[0]);

    expectFocusedModalDialog('Delete Resume?');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(deleteProfile).not.toHaveBeenCalled();
  });

  describe('on mobile', () => {
    let desktopWidth: number;
    beforeEach(() => {
      desktopWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 375 });
    });
    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: desktopWidth });
    });

    it('opens Share as a labelled modal dialog that takes focus, names its close button, and closes on Escape', () => {
      render(<MemoryRouter><EditorPage /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: 'Share Resume' }));

      const dialog = expectFocusedModalDialog('Share Your Resume');
      expect(within(dialog).getByRole('button', { name: 'Close' })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('asks before deleting a section in a labelled modal dialog that takes focus; Escape cancels', () => {
      render(<MemoryRouter><EditorPage /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: 'Choose a section' })); // mobile's delete buttons live in the section menu
      fireEvent.click(screen.getAllByRole('button', { name: 'Delete Section' })[0]);

      expectFocusedModalDialog('Delete Section?');

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('asks before deleting a resume in a labelled modal dialog that takes focus; Escape cancels', () => {
      vi.mocked(useResume.useResume).mockReturnValue(mockResume({
        appState: {
          activeProfileId: 'main',
          profiles: {
            main: { id: 'main', name: 'Main', data: DEFAULT_RESUME },
            design: { id: 'design', name: 'Design CV', data: DEFAULT_RESUME },
          },
        },
      }) as never);
      render(<MemoryRouter><EditorPage /></MemoryRouter>);
      fireEvent.click(screen.getAllByRole('button', { name: 'Main' })[0]); // open a profile switcher
      fireEvent.click(screen.getAllByRole('button', { name: 'Delete Profile' })[0]);

      expectFocusedModalDialog('Delete Resume?');

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
