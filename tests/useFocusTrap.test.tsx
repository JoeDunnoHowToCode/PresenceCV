import { describe, it, expect } from 'vitest';
import React, { useRef, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFocusTrap } from '../src/hooks/useFocusTrap';

function Popup() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel, open);
  return (
    <>
      <button onClick={() => setOpen(true)}>open</button>
      {open && (
        <div ref={panel}>
          <button>first</button>
          <button>middle</button>
          <button onClick={() => setOpen(false)}>last</button>
        </div>
      )}
    </>
  );
}

describe('useFocusTrap', () => {
  it('moves focus to the first control when it activates', () => {
    render(<Popup />);

    fireEvent.click(screen.getByText('open'));

    expect(screen.getByText('first')).toHaveFocus();
  });
});
