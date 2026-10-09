import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NoticeProvider, useNotice } from '../src/contexts/NoticeContext';

function NotifyButton({ message, tone }: { message: string; tone?: 'info' | 'error' }) {
  const { notify } = useNotice();
  return <button onClick={() => notify(message, tone)}>notify</button>;
}

describe('NoticeProvider', () => {
  it('shows a notified message as a status notice', () => {
    render(<NoticeProvider><NotifyButton message="Profile saved" /></NoticeProvider>);

    fireEvent.click(screen.getByText('notify'));

    expect(screen.getByRole('status')).toHaveTextContent('Profile saved');
  });

  it('announces error notices with role="alert"', () => {
    render(<NoticeProvider><NotifyButton message="Save failed" tone="error" /></NoticeProvider>);

    fireEvent.click(screen.getByText('notify'));

    expect(screen.getByRole('alert')).toHaveTextContent('Save failed');
  });

  it('removes a notice after 6 seconds', () => {
    vi.useFakeTimers();
    try {
      render(<NoticeProvider><NotifyButton message="Link copied" /></NoticeProvider>);
      fireEvent.click(screen.getByText('notify'));

      act(() => { vi.advanceTimersByTime(5999); });
      expect(screen.getByRole('status')).toHaveTextContent('Link copied');

      act(() => { vi.advanceTimersByTime(1); });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('removes a notice when its dismiss button is pressed', () => {
    render(<NoticeProvider><NotifyButton message="Link copied" /></NoticeProvider>);
    fireEvent.click(screen.getByText('notify'));

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
