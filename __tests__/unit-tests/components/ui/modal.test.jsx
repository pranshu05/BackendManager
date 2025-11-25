import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import Modal from '@/components/ui/modal';

describe('Modal (minimal)', () => {
  afterEach(() => {
    cleanup();
    // ensure document.body style is reset between tests
    document.body.style.overflow = '';
  });

  test('renders nothing when not open', () => {
    const { container } = render(<Modal open={false} title="T" />);
    expect(container.firstChild).toBeNull();
  });

  test('opens, sets body overflow, closes via Escape/backdrop/close button and stops propagation for content', async () => {
    const onClose = jest.fn();

    const { container, unmount } = render(
      <Modal open title="My modal" subtitle="sub" onClose={onClose}>
        <div>Child content</div>
      </Modal>
    );

    // body overflow should be hidden while open
    expect(document.body.style.overflow).toBe('hidden');

    // close via Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    // close via close button
    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(2);

    // clicking the content should not call backdrop onClose due to stopPropagation
    const contentChild = screen.getByText('Child content');
    fireEvent.click(contentChild);
    expect(onClose).toHaveBeenCalledTimes(2);

    // clicking backdrop triggers onClose
    const backdrop = container.querySelector('div.absolute');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(3);

    // unmount triggers cleanup and restores body overflow
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  test('shows loading (inline) content with defaults and custom titles', () => {
    render(
      <Modal open title="T" loading loadingTitle="MyLoad" loadingSubtitle="SubLoad">
        <div>Hidden child</div>
      </Modal>
    );

    // Provided loadingTitle/subtitle should be used
    expect(screen.getByText('MyLoad')).toBeInTheDocument();
    expect(screen.getByText('SubLoad')).toBeInTheDocument();
  });

  test('shows inline loading defaults when no titles provided', () => {
    render(<Modal open title="T" loading>
      <div>Hidden child</div>
    </Modal>);

    expect(screen.getByText('Preparing...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we prepare the form.')).toBeInTheDocument();
  });

  test('shows loading overlay variant and still renders children', () => {
    render(
      <Modal open title="T" loading loadingOverlay>
        <div>Visible child</div>
      </Modal>
    );

    // overlay variant uses Processing / Please wait defaults
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByText('Please wait.')).toBeInTheDocument();
    // children still present below the spinner block
    expect(screen.getByText('Visible child')).toBeInTheDocument();
  });

  test('non-escape key does not call onClose and subtitle absent path', () => {
    const onClose = jest.fn();
    render(
      <Modal open title="No subtitle" onClose={onClose}>
        <div>Body</div>
      </Modal>
    );

    // subtitle was not provided
    expect(screen.queryByText('No subtitle')).toBeInTheDocument();
    expect(screen.queryByText('subtitle')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  test('effect early-return branch runs when open switches to false', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <Modal open title="flip" onClose={onClose}>
        <div>Flip</div>
      </Modal>
    );

    // ensure overflow set
    expect(document.body.style.overflow).toBe('hidden');

    // flip to closed -> effect should early return and cleanup should have run => overflow restored
    rerender(<Modal open={false} title="flip" onClose={onClose} />);
    expect(document.body.style.overflow).toBe('');
  });
});
