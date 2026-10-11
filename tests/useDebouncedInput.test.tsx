import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useDebouncedInput } from '../src/components/editor/InfoEditor';

// Wired the way the editors wire it: an uncontrolled input and a new inline onSave arrow on every render.
function NameField({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const { ref, defaultValue, onChange, onBlur } = useDebouncedInput(value, (val) => onSave(val));
  return (
    <input
      aria-label="Name"
      ref={ref as React.Ref<HTMLInputElement>}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
    />
  );
}

describe('useDebouncedInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a new outside value while the field is not focused', () => {
    const { rerender } = render(<NameField value="Alex" onSave={vi.fn()} />);

    rerender(<NameField value="Sam" onSave={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Sam');
  });

  it('keeps what the user typed when a new outside value arrives while the field is focused', () => {
    const { rerender } = render(<NameField value="Alex" onSave={vi.fn()} />);
    const field = screen.getByRole('textbox', { name: 'Name' });
    field.focus();
    fireEvent.change(field, { target: { value: 'Alex R.' } });

    rerender(<NameField value="Sam" onSave={vi.fn()} />);

    expect(field).toHaveValue('Alex R.');
  });
});
