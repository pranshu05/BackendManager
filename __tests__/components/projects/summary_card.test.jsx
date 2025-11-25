import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SummaryCard from '@/components/(projects)/summary_card';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Sparkles: ({ className }) => <div className={className} data-testid="sparkles-icon" />,
  Database: ({ className }) => <div className={className} data-testid="database-icon" />,
  TrendingUp: ({ className }) => <div className={className} data-testid="trending-up-icon" />,
  Code: ({ className }) => <div className={className} data-testid="code-icon" />,
  X: ({ className, onClick }) => <div className={className} data-testid="x-icon" onClick={onClick} />,
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className }) => (
    <button onClick={onClick} className={className} data-testid="button">
      {children}
    </button>
  ),
}));

// Mock DotLottieReact
jest.mock('@lottiefiles/dotlottie-react', () => ({
  DotLottieReact: ({ className, src, loop, autoplay }) => (
    <div className={className} data-testid="lottie-animation" />
  ),
}));

describe('SummaryCard Component', () => {
  const mockOnClose = jest.fn();
  const projectId = 'test-project-123';

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Render - No Summary, Not Loading, No Error', () => {
    test('should render initial state with generate button when no summary, not loading, no error', () => {
      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      expect(screen.getByText('Database Summary')).toBeInTheDocument();
      expect(screen.getByText('Here is an AI-powered summary of your database structure and contents')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate Summary/i })).toBeInTheDocument();
      expect(screen.getAllByTestId('sparkles-icon')).toHaveLength(2);
    });

    test('should call fetchSummary when Generate Summary button is clicked', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          summary: {
            quickStats: {
              totalTables: 6,
              totalColumns: 45,
              totalRelationships: 8,
              estimatedRows: '2,450 records',
            },
            description: 'Test description',
            techSpecs: 'Test specs',
          },
        }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${projectId}/summary`);
      });
    });

    test('should render header with database icon and heading', () => {
      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      expect(screen.getByTestId('database-icon')).toBeInTheDocument();
      expect(screen.getByText('Database Summary')).toBeInTheDocument();
    });

    test('should render close button with X icon', () => {
      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const xIcon = screen.getByTestId('x-icon');
      expect(xIcon).toBeInTheDocument();
    });

    test('should call onClose when X button is clicked', () => {
      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const xIcon = screen.getByTestId('x-icon');
      fireEvent.click(xIcon);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    test('should render loading state when loading is true', async () => {
      global.fetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Analyzing database...')).toBeInTheDocument();
        expect(screen.getByText('This may take a few moments')).toBeInTheDocument();
        expect(screen.getByTestId('lottie-animation')).toBeInTheDocument();
      });
    });

    test('should not display initial state when loading is true', async () => {
      global.fetch.mockImplementationOnce(() => new Promise(() => {}));

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.queryByText('Here is an AI-powered summary of your database structure and contents')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    test('should render error state when fetch fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to generate summary')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    test('should render error state when response is not ok with error message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error occurred' }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Server error occurred')).toBeInTheDocument();
      });
    });

    test('should render error state when response is not ok without error message', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getAllByText('Failed to generate summary')).toHaveLength(2); // Title and message
      });
    });

    test('should render error icon in error state', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        const errorSvg = document.querySelector('.error-icon');
        expect(errorSvg).toBeInTheDocument();
        expect(errorSvg.tagName).toBe('svg');
      });
    });

    test('should have Try Again button in error state', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
      });
    });

    test('should retry fetch when Try Again button is clicked', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          summary: {
            quickStats: {
              totalTables: 5,
              totalColumns: 40,
              totalRelationships: 7,
              estimatedRows: '1,000 records',
            },
            description: 'Retry description',
            techSpecs: 'Retry specs',
          },
        }),
      });

      const tryAgainButton = screen.getByRole('button', { name: /Try Again/i });
      fireEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Summary Content Display', () => {
    test('should display summary content when fetch succeeds', async () => {
      const summaryData = {
        quickStats: {
          totalTables: 6,
          totalColumns: 45,
          totalRelationships: 8,
          estimatedRows: '2,450 records',
        },
        description: 'Test database description',
        techSpecs: 'PostgreSQL database specs',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: summaryData }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Quick Stats')).toBeInTheDocument();
        expect(screen.getByText('What\'s Inside')).toBeInTheDocument();
        expect(screen.getByText('Tech Specs')).toBeInTheDocument();
      });
    });

    test('should display quick stats with correct values', async () => {
      const summaryData = {
        quickStats: {
          totalTables: 6,
          totalColumns: 45,
          totalRelationships: 8,
          estimatedRows: '2,450 records',
        },
        description: 'Test',
        techSpecs: 'Test',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: summaryData }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('6')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
        expect(screen.getByText('2,450')).toBeInTheDocument();
      });
    });

    test('should display correct labels for quick stats', async () => {
      const summaryData = {
        quickStats: {
          totalTables: 3,
          totalColumns: 20,
          totalRelationships: 5,
          estimatedRows: '500 records',
        },
        description: 'Test',
        techSpecs: 'Test',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: summaryData }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Tables')).toBeInTheDocument();
        expect(screen.getByText('Columns')).toBeInTheDocument();
        expect(screen.getByText('Relations')).toBeInTheDocument();
        expect(screen.getByText('Records')).toBeInTheDocument();
      });
    });

    test('should display TrendingUp icon in quick stats section', async () => {
      const summaryData = {
        quickStats: {
          totalTables: 1,
          totalColumns: 10,
          totalRelationships: 1,
          estimatedRows: '100 records',
        },
        description: 'Test',
        techSpecs: 'Test',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: summaryData }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
      });
    });

    test('should display description in What\'s Inside section', async () => {
      const summaryData = {
        quickStats: {
          totalTables: 1,
          totalColumns: 10,
          totalRelationships: 1,
          estimatedRows: '100 records',
        },
        description: 'This is a test database with important data',
        techSpecs: 'Test specs',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: summaryData }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('This is a test database with important data')).toBeInTheDocument();
      });
    });

    test('should display tech specs in Tech Specs section', async () => {
      const summaryData = {
        quickStats: {
          totalTables: 1,
          totalColumns: 10,
          totalRelationships: 1,
          estimatedRows: '100 records',
        },
        description: 'Test',
        techSpecs: 'MySQL 8.0 with InnoDB engine and ACID compliance',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: summaryData }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('MySQL 8.0 with InnoDB engine and ACID compliance')).toBeInTheDocument();
      });
    });

    test('should display Code icon in Tech Specs section', async () => {
      const summaryData = {
        quickStats: {
          totalTables: 1,
          totalColumns: 10,
          totalRelationships: 1,
          estimatedRows: '100 records',
        },
        description: 'Test',
        techSpecs: 'Test specs',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: summaryData }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByTestId('code-icon')).toBeInTheDocument();
      });
    });

    test('should hide initial state when summary is displayed', async () => {
      const summaryData = {
        quickStats: {
          totalTables: 1,
          totalColumns: 10,
          totalRelationships: 1,
          estimatedRows: '100 records',
        },
        description: 'Test',
        techSpecs: 'Test',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: summaryData }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.queryByText('Here is an AI-powered summary of your database structure and contents')).not.toBeInTheDocument();
      });
    });
  });

  describe('State Management', () => {
    test('should set loading to true before fetch and false after', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          summary: {
            quickStats: {
              totalTables: 1,
              totalColumns: 10,
              totalRelationships: 1,
              estimatedRows: '100 records',
            },
            description: 'Test',
            techSpecs: 'Test',
          },
        }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      // Loading state should be visible first
      await waitFor(() => {
        expect(screen.getByText('Analyzing database...')).toBeInTheDocument();
      });

      // Then loading state should disappear
      await waitFor(() => {
        expect(screen.queryByText('Analyzing database...')).not.toBeInTheDocument();
      });
    });

    test('should clear error on new fetch attempt', async () => {
      global.fetch.mockRejectedValueOnce(new Error('First error'));

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument();
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          summary: {
            quickStats: {
              totalTables: 1,
              totalColumns: 10,
              totalRelationships: 1,
              estimatedRows: '100 records',
            },
            description: 'Success',
            techSpecs: 'Test',
          },
        }),
      });

      const tryAgainButton = screen.getByRole('button', { name: /Try Again/i });
      fireEvent.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle estimatedRows with multiple spaces', async () => {
      const summaryData = {
        quickStats: {
          totalTables: 1,
          totalColumns: 10,
          totalRelationships: 1,
          estimatedRows: '5000   records   more',
        },
        description: 'Test',
        techSpecs: 'Test',
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: summaryData }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('5000')).toBeInTheDocument();
      });
    });

    test('should handle fetch with no data returned', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: null }),
      });

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        // Should not display summary content since summary is null
        expect(screen.queryByText('Quick Stats')).not.toBeInTheDocument();
      });
    });

    test('should use correct project ID in fetch URL', async () => {
      const customProjectId = 'custom-project-999';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          summary: {
            quickStats: {
              totalTables: 1,
              totalColumns: 10,
              totalRelationships: 1,
              estimatedRows: '100 records',
            },
            description: 'Test',
            techSpecs: 'Test',
          },
        }),
      });

      render(<SummaryCard projectId={customProjectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(`/api/projects/${customProjectId}/summary`);
      });
    });

    test('should log error to console when fetch fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      global.fetch.mockRejectedValueOnce(new Error('Test error'));

      render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Full Integration Flow', () => {
    test('should complete full flow from initial state to summary display', async () => {
      const summaryData = {
        quickStats: {
          totalTables: 6,
          totalColumns: 45,
          totalRelationships: 8,
          estimatedRows: '2,450 records',
        },
        description: 'E-commerce database',
        techSpecs: 'PostgreSQL with ACID compliance',
      };

      // Initial render - initial state
      const { rerender } = render(<SummaryCard projectId={projectId} onClose={mockOnClose} />);
      expect(screen.getByText('Here is an AI-powered summary of your database structure and contents')).toBeInTheDocument();

      // Click generate
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ summary: summaryData }),
      });

      const generateButton = screen.getByRole('button', { name: /Generate Summary/i });
      fireEvent.click(generateButton);

      // Should show loading
      await waitFor(() => {
        expect(screen.getByText('Analyzing database...')).toBeInTheDocument();
      });

      // Should show summary
      await waitFor(() => {
        expect(screen.getByText('E-commerce database')).toBeInTheDocument();
        expect(screen.getByText('PostgreSQL with ACID compliance')).toBeInTheDocument();
      });
    });
  });
});
