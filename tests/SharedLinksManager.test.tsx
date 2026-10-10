import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import SharedLinksManager from '../src/components/editor/SharedLinksManager';
import { NoticeProvider } from '../src/contexts/NoticeContext';
import * as sharedLinks from '../src/hooks/useSharedLinks';

vi.mock('../src/hooks/useSharedLinks', () => ({ useSharedLinks: vi.fn() }));

const revokeSnapshot = vi.fn();

describe('SharedLinksManager', () => {
  beforeEach(() => {
    revokeSnapshot.mockReset().mockResolvedValue(undefined);
    vi.mocked(sharedLinks.useSharedLinks).mockReturnValue({
      links: [
        { id: 'new', createdAt: Date.UTC(2026, 9, 9), profileName: 'Design CV' },
        { id: 'old', createdAt: Date.UTC(2026, 8, 1), profileName: 'Main' },
      ],
      revokeSnapshot,
    });
  });

  it('lists snapshot links and revokes the one clicked', async () => {
    render(<NoticeProvider><SharedLinksManager uid="u1" hasLiveLink={false} onStopLive={vi.fn()} /></NoticeProvider>);
    const row = screen.getByText('Design CV').closest('li')!;

    fireEvent.click(within(row).getByRole('button', { name: /revoke/i }));

    expect(revokeSnapshot).toHaveBeenCalledWith('new');
    expect(await screen.findByRole('status')).toHaveTextContent('Link revoked.');
  });

  it('offers to stop the live link only when there is one', () => {
    const onStopLive = vi.fn();
    const { rerender } = render(<NoticeProvider><SharedLinksManager uid="u1" hasLiveLink={false} onStopLive={onStopLive} /></NoticeProvider>);
    expect(screen.queryByRole('button', { name: 'Stop sharing the live link' })).not.toBeInTheDocument();

    rerender(<NoticeProvider><SharedLinksManager uid="u1" hasLiveLink onStopLive={onStopLive} /></NoticeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Stop sharing the live link' }));

    expect(onStopLive).toHaveBeenCalledTimes(1);
  });
});
