import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImportResumeModal } from '../src/components/ImportResumeModal';
import { useAuth } from '../src/contexts/AuthContext';
import en from '../src/i18n/locales/en.json';

// The shared i18n mock (src/setupTests.ts) drops {{placeholders}}; these tests need the numbers.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const value = key.split('.').reduce<any>((node, part) => node?.[part], en);
      if (typeof value !== 'string') return key;
      return value.replace(/{{(\w+)}}/g, (_, name) => String(options?.[name] ?? ''));
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('../src/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../src/lib/firebase', () => ({
  auth: { currentUser: { getIdToken: vi.fn().mockResolvedValue('mock-token-123') } },
  db: {},
}));

// Answers /api/ai-quota with the given body (and /api/parse-resume with an optional second body).
const mockApi = (quotaBody: unknown) => {
  global.fetch = vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => (url === '/api/ai-quota' ? quotaBody : {}),
  })) as never;
};

const NOW = Date.UTC(2026, 9, 18, 2, 0, 0);

describe('ImportResumeModal - AI-import quota', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'u1' } } as never);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows how many imports are left and a countdown to the window end, ticking every second', async () => {
    mockApi({ remaining: 3, limit: 5, resetAt: NOW + 2 * 3600_000 + 5 * 60_000 + 7_000 });

    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);

    expect(await screen.findByText('3 AI imports left · back to 5 in 02:05:07')).toBeInTheDocument();
    await act(async () => {}); // let React run the effects (which start the countdown timer) before moving the clock
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('3 AI imports left · back to 5 in 02:05:06')).toBeInTheDocument();
  });

  it('changes the countdown when the displayed second changes, not up to a second late', async () => {
    mockApi({ remaining: 3, limit: 5, resetAt: NOW + 2 * 3600_000 + 5 * 60_000 + 7_300 });

    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);

    expect(await screen.findByText('3 AI imports left · back to 5 in 02:05:08')).toBeInTheDocument();
    await act(async () => {});
    await act(async () => { vi.advanceTimersByTime(400); }); // 7.3 s left → 6.9 s: the display must already say 07
    expect(screen.getByText('3 AI imports left · back to 5 in 02:05:07')).toBeInTheDocument();
  });

  it('shows no quota line before the first import (no window yet) or for an admin', async () => {
    mockApi({ remaining: 5, limit: 5, resetAt: null });
    const { unmount } = render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/ai-quota', expect.anything()));
    await act(async () => {});
    expect(screen.queryByText(/AI imports left|No AI imports left/)).not.toBeInTheDocument();
    unmount();

    mockApi({ unlimited: true });
    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/ai-quota', expect.anything()));
    await act(async () => {});
    expect(screen.queryByText(/AI imports left|No AI imports left/)).not.toBeInTheDocument();
  });
});
