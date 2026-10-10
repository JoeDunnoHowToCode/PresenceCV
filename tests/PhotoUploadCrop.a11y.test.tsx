import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PhotoUploadCrop from '../src/components/editor/PhotoUploadCrop';
import { NoticeProvider } from '../src/contexts/NoticeContext';

describe('PhotoUploadCrop accessibility', () => {
  it('opens the crop step as a labelled modal dialog that takes focus; Escape cancels it', async () => {
    const updateProfile = vi.fn();
    const { container } = render(
      <NoticeProvider>
        <PhotoUploadCrop photo={undefined} photoPosition={undefined} updateProfile={updateProfile} />
      </NoticeProvider>,
    );
    const photo = new File(['not really a png'], 'me.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('#photo-upload')!, { target: { files: [photo] } });

    const dialog = await screen.findByRole('dialog', { name: 'Crop Profile Photo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
