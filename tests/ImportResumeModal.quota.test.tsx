import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
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

  it('when the imports are used up, disables upload until the countdown ends, then goes back to normal', async () => {
    mockApi({ remaining: 0, limit: 5, resetAt: NOW + 3_000 });
    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);

    expect(await screen.findByText('No AI imports left · back to 5 in 00:00:03')).toBeInTheDocument();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDisabled();

    await act(async () => {});
    await act(async () => { vi.advanceTimersByTime(3_000); });

    expect(screen.queryByText(/No AI imports left/)).not.toBeInTheDocument();
    expect(fileInput).not.toBeDisabled();
  });

  it('turns a 429 from the import into the used-up countdown instead of showing the raw error', async () => {
    const resetAt = NOW + 90_000;
    global.fetch = vi.fn(async (url: string) => (url === '/api/ai-quota'
      ? { ok: true, status: 200, json: async () => ({ remaining: 1, limit: 5, resetAt: NOW + 60_000 }) }
      : { ok: false, status: 429, json: async () => ({ error: 'AI_IMPORT_LIMIT', remaining: 0, limit: 5, resetAt }) })) as never;
    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);
    await screen.findByText(/1 AI imports left/);

    const file = new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });

    expect(await screen.findByText('No AI imports left · back to 5 in 00:01:30')).toBeInTheDocument();
    expect(screen.queryByText(/AI_IMPORT_LIMIT/)).not.toBeInTheDocument();
  });

  it('says the AI service is unavailable when the import is refused without a window end (no quota store in production)', async () => {
    global.fetch = vi.fn(async (url: string) => (url === '/api/ai-quota'
      ? { ok: true, status: 200, json: async () => ({ remaining: 0, limit: 5, resetAt: null }) }
      : { ok: false, status: 429, json: async () => ({ error: 'AI_IMPORT_LIMIT', remaining: 0, limit: 5, resetAt: null }) })) as never;
    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);

    const file = new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });

    expect(await screen.findByText(en.importModal.errors.serverUnavailable)).toBeInTheDocument();
  });

  it('describes the files it really accepts: PDF, JPG or PNG up to 3MB, no DOCX', async () => {
    mockApi({ remaining: 5, limit: 5, resetAt: null });
    render(<ImportResumeModal isOpen={true} onClose={() => {}} onImport={() => {}} />);

    expect(screen.getByText('Supports PDF, JPG, PNG (Max 3MB)')).toBeInTheDocument();
    expect(screen.queryByText(/DOCX|5MB/)).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toHaveAttribute('accept', '.pdf,image/png,image/jpeg');
    await act(async () => {});
  });
});
