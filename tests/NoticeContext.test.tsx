import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
});
