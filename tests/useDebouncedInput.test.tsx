import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

  it('saves once, 1000 ms after the last of two quick changes', () => {
    const onSave = vi.fn();
    render(<NameField value="Alex" onSave={onSave} />);
    const field = screen.getByRole('textbox', { name: 'Name' });
    field.focus();

    fireEvent.change(field, { target: { value: 'Alex R' } });
    act(() => { vi.advanceTimersByTime(600); });
    fireEvent.change(field, { target: { value: 'Alex R.' } });
    act(() => { vi.advanceTimersByTime(999); });

    expect(onSave).not.toHaveBeenCalled();

    act(() => { vi.advanceTimersByTime(1); });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('Alex R.');
  });

  it('saves a pending edit exactly once when the field loses focus', () => {
    const onSave = vi.fn();
    render(<NameField value="Alex" onSave={onSave} />);
    const field = screen.getByRole('textbox', { name: 'Name' });
    field.focus();
    fireEvent.change(field, { target: { value: 'Alex R.' } });

    act(() => { field.blur(); });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('Alex R.');

    act(() => { vi.advanceTimersByTime(1000); });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('saves a pending edit exactly once when the field unmounts', () => {
    const onSave = vi.fn();
    const { unmount } = render(<NameField value="Alex" onSave={onSave} />);
    const field = screen.getByRole('textbox', { name: 'Name' });
    field.focus();
    fireEvent.change(field, { target: { value: 'Alex R.' } });

    unmount();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('Alex R.');

    act(() => { vi.advanceTimersByTime(1000); });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('sends a pending save to the onSave from the newest render', () => {
    const firstOnSave = vi.fn();
    const newestOnSave = vi.fn();
    const { rerender } = render(<NameField value="Alex" onSave={firstOnSave} />);
    const field = screen.getByRole('textbox', { name: 'Name' });
    field.focus();
    fireEvent.change(field, { target: { value: 'Alex R.' } });

    rerender(<NameField value="Alex" onSave={newestOnSave} />);
    act(() => { vi.advanceTimersByTime(1000); });

    expect(firstOnSave).not.toHaveBeenCalled();
    expect(newestOnSave).toHaveBeenCalledTimes(1);
    expect(newestOnSave).toHaveBeenCalledWith('Alex R.');
  });
});
