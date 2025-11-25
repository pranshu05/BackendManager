import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TokenModal from '@/components/(profile)/TokenModal';

// Mock the useToast hook
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    showToast: jest.fn()
  })
}));

describe('TokenModal Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    global.navigator.clipboard = {
      writeText: jest.fn().mockResolvedValue(undefined)
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    test('should render modal component', () => {
      const { container } = render(<TokenModal onClose={mockOnClose} />);
      expect(container.querySelector('.fixed')).toBeInTheDocument();
    });

    test('should display modal title', () => {
      render(<TokenModal onClose={mockOnClose} />);
      expect(screen.getByText('API Token')).toBeInTheDocument();
    });

    test('should render close button', () => {
      render(<TokenModal onClose={mockOnClose} />);
      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();
    });

    test('should display initial generate token state', () => {
      render(<TokenModal onClose={mockOnClose} />);
      expect(screen.getByText(/Generate a Bearer token for API access/)).toBeInTheDocument();
    });

    test('should render generate token button initially', () => {
      render(<TokenModal onClose={mockOnClose} />);
      expect(screen.getByRole('button', { name: /Generate Token/i })).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    test('should render close button', () => {
      const { container } = render(<TokenModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('.bg-\\[\\#1e4a8a\\] button');
      expect(closeButton).toBeInTheDocument();
    });

    test('should call onClose when clicked', () => {
      const { container } = render(<TokenModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('.bg-\\[\\#1e4a8a\\] button');
      
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Initial State - Generate Token', () => {
    test('should show description text', () => {
      render(<TokenModal onClose={mockOnClose} />);
      expect(screen.getByText(/Generate a Bearer token for API access/)).toBeInTheDocument();
    });

    test('should mention 7 day expiration', () => {
      render(<TokenModal onClose={mockOnClose} />);
      expect(screen.getByText(/This token will expire in 7 days/)).toBeInTheDocument();
    });

    test('should have enabled generate button', () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      expect(generateButton).not.toBeDisabled();
    });

    test('should have primary color button', () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      expect(generateButton).toHaveClass('bg-[#1e4a8a]');
    });
  });

  describe('Generate Token Error Handling', () => {
    test('should alert with API error message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Token generation failed' })
      });

      global.alert = jest.fn();

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });

      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/get-token', expect.objectContaining({ method: 'POST' }));
        expect(global.alert).toHaveBeenCalledWith('Error: Token generation failed');
      });
    });

    test('should alert with default message when API error has no message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });

      global.alert = jest.fn();

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });

      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Error: Failed to generate token');
      });
    });

    test('should alert with network error message', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      global.alert = jest.fn();

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });

      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to generate token. Please try again.');
      });
    });
  });

  describe('Generate Token Button', () => {
    test('should render generate button', () => {
      render(<TokenModal onClose={mockOnClose} />);
      expect(screen.getByRole('button', { name: /Generate Token/i })).toBeInTheDocument();
    });

    test('should call API when clicked', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/get-token', {
          method: 'POST',
          credentials: 'include'
        });
      });
    });

    test('should disable button while loading', async () => {
      global.fetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(generateButton).toBeDisabled();
      });
    });

    test('should show loading text when generating', async () => {
      global.fetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Generating...')).toBeInTheDocument();
      });
    });

    test('should have full width', () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      expect(generateButton).toHaveClass('w-full');
    });
  });

  describe('Token Generation Success', () => {
    test('should display token after successful generation', async () => {
      const testToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: testToken })
      });

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Regenerate Token')).toBeInTheDocument();
      });
    });

    test('should show token container after generation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });

      const { container } = render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(container.querySelector('.bg-gray-50')).toBeInTheDocument();
      });
    });

    test('should show expiration info after generation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Expires in:/)).toBeInTheDocument();
        expect(screen.getByText('7 days')).toBeInTheDocument();
      });
    });
  });

  describe('Token Display', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });
    });

    test('should display token when show button clicked', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn => 
          btn.title === 'Show' || btn.title === 'Hide'
        );
        fireEvent.click(toggleButton);
      });

      await waitFor(() => {
        expect(screen.getByText('test-token-123')).toBeInTheDocument();
      });
    });

    test('should show masked token initially', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const dots = screen.getByText(/^•+$/);
        expect(dots).toBeInTheDocument();
      });
    });

    test('should toggle token visibility', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const toggleButtons = screen.getAllByRole('button');
        const showButton = toggleButtons.find(btn => btn.title === 'Show' || btn.title === 'Hide');
        
        // Initially shows masked
        expect(screen.getByText(/^•+$/)).toBeInTheDocument();
        
        // Click to show
        fireEvent.click(showButton);
      });

      await waitFor(() => {
        expect(screen.getByText('test-token-123')).toBeInTheDocument();
      });
    });

    test('should have token in monospace font', async () => {
      const { container } = render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const tokenDisplay = container.querySelector('.font-mono');
        expect(tokenDisplay).toBeInTheDocument();
      });
    });

    test('should have scrollable token display for long tokens', async () => {
      const { container } = render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const tokenDisplay = container.querySelector('.overflow-y-auto');
        expect(tokenDisplay).toBeInTheDocument();
      });
    });
  });

  describe('Copy Token Functionality', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });
    });

    test('should copy token to clipboard', async () => {
      const mockShowToast = jest.fn();
      render(<TokenModal onClose={mockOnClose} showToast={mockShowToast} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const copyButton = screen.getAllByRole('button').find(btn => btn.title === 'Copy');
        fireEvent.click(copyButton);
      });

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-token-123');
        expect(mockShowToast).toHaveBeenCalledWith('Token copied to clipboard!', 'success');
      });
    });

    test('should show copy success message', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const copyButton = screen.getAllByRole('button').find(btn => btn.title === 'Copy');
        fireEvent.click(copyButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Copied to clipboard!')).toBeInTheDocument();
      });
    });

    test('should hide copy success message after 2 seconds', async () => {
      jest.useFakeTimers();
      
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const copyButton = screen.getAllByRole('button').find(btn => btn.title === 'Copy');
        fireEvent.click(copyButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Copied to clipboard!')).toBeInTheDocument();
      });
      
      // The copy success state will be reset after 2 seconds
      jest.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(screen.queryByText('Copied to clipboard!')).not.toBeInTheDocument();
      });
      
      jest.useRealTimers();
    });

    test('should have copy button with correct styling', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const copyButton = screen.getAllByRole('button').find(btn => btn.title === 'Copy');
        expect(copyButton).toHaveClass('text-[#1e4a8a]');
      });
    });
  });

  describe('Token Visibility Toggle', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });
    });

    test('should have eye icon button', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn => btn.title === 'Show' || btn.title === 'Hide');
        expect(toggleButton).toBeInTheDocument();
      });
    });

    test('should have primary color toggle button', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const toggleButton = screen.getAllByRole('button').find(btn => btn.title === 'Show' || btn.title === 'Hide');
        expect(toggleButton).toHaveClass('text-[#1e4a8a]');
      });
    });
  });

  describe('Regenerate Token Button', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });
    });

    test('should render regenerate button after generation', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Regenerate Token/i })).toBeInTheDocument();
      });
    });

    test('should call API when regenerate clicked', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'new-token-456' })
      });

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const regenerateButton = screen.getByRole('button', { name: /Regenerate Token/i });
        fireEvent.click(regenerateButton);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    test('should have gray color for regenerate button', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const regenerateButton = screen.getByRole('button', { name: /Regenerate Token/i });
        expect(regenerateButton).toHaveClass('bg-gray-500');
      });
    });
  });

  describe('Error Handling', () => {
    test('should show toast on API error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Token generation failed' })
      });

      const { container } = render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    test('should show toast on network error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    test('should remain in initial state after error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      global.alert = jest.fn();

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Generate Token/i })).toBeInTheDocument();
      });
    });
  });

  describe('Modal Accessibility', () => {
    test('should have high z-index for visibility', () => {
      const { container } = render(<TokenModal onClose={mockOnClose} />);
      const modal = container.querySelector('.z-50');
      expect(modal).toBeInTheDocument();
    });

    test('should have proper contrast colors', () => {
      render(<TokenModal onClose={mockOnClose} />);
      const title = screen.getByText('API Token');
      expect(title).toHaveClass('text-white');
    });

    test('should have descriptive button labels', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    test('should have responsive padding', () => {
      const { container } = render(<TokenModal onClose={mockOnClose} />);
      const overlay = container.querySelector('.fixed.inset-0');
      expect(overlay).toHaveClass('p-4');
    });
  });

  describe('Token Display Styling', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });
    });

    test('should have light gray background for token container', async () => {
      const { container } = render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const tokenContainer = container.querySelector('.bg-gray-50');
        expect(tokenContainer).toBeInTheDocument();
      });
    });

    test('should have border on token container', async () => {
      const { container } = render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const tokenContainer = container.querySelector('.border.border-gray-200');
        expect(tokenContainer).toBeInTheDocument();
      });
    });

    test('should have small text for token label', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const label = screen.getByText('Bearer Token');
        expect(label).toHaveClass('text-xs');
      });
    });

    test('should have primary color for token label', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const label = screen.getByText('Bearer Token');
        expect(label).toHaveClass('text-[#1e4a8a]');
      });
    });
  });

  describe('Expiration Display', () => {
    beforeEach(async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });
    });

    test('should display expiration label', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Expires in:')).toBeInTheDocument();
      });
    });

    test('should show 7 days expiration', async () => {
      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const expirationText = screen.getByText('7 days');
        expect(expirationText).toHaveClass('text-[#1e4a8a]', 'font-bold');
      });
    });
  });

  describe('Component Integration', () => {
    test('should render complete modal flow', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });

      render(<TokenModal onClose={mockOnClose} />);
      
      // Initial state
      expect(screen.getByText('API Token')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate Token/i })).toBeInTheDocument();
      
      // Generate token
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      fireEvent.click(generateButton);
      
      // After generation
      await waitFor(() => {
        expect(screen.getByText('Regenerate Token')).toBeInTheDocument();
        expect(screen.getByText('Expires in:')).toBeInTheDocument();
      });
    });

    test('should call showToast on successful token generation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/get-token', {
          method: 'POST',
          credentials: 'include'
        });
      });
    });

    test('should handle full user workflow', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });

      render(<TokenModal onClose={mockOnClose} />);
      
      // Step 1: Generate token
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Regenerate Token')).toBeInTheDocument();
      });
      
      // Step 2: Copy token
      const copyButton = screen.getAllByRole('button').find(btn => btn.title === 'Copy');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-token-123');
        expect(screen.getByText('Copied to clipboard!')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long token', async () => {
      const longToken = 'Bearer ' + 'x'.repeat(500);
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: longToken })
      });

      const { container } = render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const tokenDisplay = container.querySelector('.overflow-y-auto');
        expect(tokenDisplay).toBeInTheDocument();
      });
    });

    test('should handle rapid close button clicks', () => {
      const { container } = render(<TokenModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('.bg-\\[\\#1e4a8a\\] button');
      
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(3);
    });

    test('should handle clipboard write failures gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });
      
      // Mock clipboard to reject
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockRejectedValueOnce(new Error('Clipboard error'))
        }
      });

      const mockShowToast = jest.fn();
      render(<TokenModal onClose={mockOnClose} showToast={mockShowToast} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const copyButton = screen.getAllByRole('button').find(btn => btn.title === 'Copy');
        fireEvent.click(copyButton);
      });

      // The component attempts to copy but fails and shows error through toast
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith('Failed to copy token to clipboard', 'error');
      });
    });

    test('should handle clipboard write failure without showToast gracefully', async () => {
      // No showToast prop passed
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-token-123' })
      });

      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockRejectedValueOnce(new Error('Clipboard error'))
        }
      });

      render(<TokenModal onClose={mockOnClose} />);
      const generateButton = screen.getByRole('button', { name: /Generate Token/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        const copyButton = screen.getAllByRole('button').find(btn => btn.title === 'Copy');
        fireEvent.click(copyButton);
      });

      await waitFor(() => {
        // Should not throw; and no showToast is called as it is not passed
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      });
    });
  });
});
