import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SchemaPage from '@/components/(projects)/schema';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'test-project-123' })
}));

// Mock DotLottieReact
jest.mock('@lottiefiles/dotlottie-react', () => ({
  DotLottieReact: () => <div data-testid="loading-animation">Loading Animation</div>
}));

// Mock react-zoom-pan-pinch
jest.mock('react-zoom-pan-pinch', () => ({
  TransformWrapper: ({ children, initialScale, minScale, maxScale }) => (
    <div data-testid="transform-wrapper">
      {children({
        zoomIn: jest.fn(),
        zoomOut: jest.fn(),
        resetTransform: jest.fn()
      })}
    </div>
  ),
  TransformComponent: ({ children, wrapperStyle }) => (
    <div data-testid="transform-component" style={wrapperStyle}>
      {children}
    </div>
  )
}));

// Mock plantuml-encoder
jest.mock('plantuml-encoder', () => ({
  encode: jest.fn((uml) => 'encoded-uml-string')
}));

describe('SchemaPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    test('should render schema page component', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\nClass User\n@enduml' })
      });

      const { container } = render(<SchemaPage />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('should display page title', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);
      expect(screen.getByText('Database Schema Diagram')).toBeInTheDocument();
    });

    test('should display zoom controls', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Zoom In/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Zoom Out/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument();
      });
    });

    test('should display tips section', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByText('Tips:')).toBeInTheDocument();
        expect(screen.getByText(/Use mouse wheel or pinch gesture to zoom/)).toBeInTheDocument();
      });
    });
  });

  describe('Diagram Fetching', () => {
    test('should fetch diagram on component mount', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\nClass User\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/projects/test-project-123/diagram',
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      });
    });

    test('should use correct project ID from params', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        const callUrl = global.fetch.mock.calls[0][0];
        expect(callUrl).toContain('test-project-123');
      });
    });

    test('should set UML code when diagram fetched successfully', async () => {
      const testUML = '@startuml\nClass User\nClass Order\n@enduml';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: testUML })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByAltText('Schema Diagram')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    test('should display loading animation while fetching', async () => {
      global.fetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByText('Rendering schema diagram')).toBeInTheDocument();
      });
    });

    test('should show loading message with details', async () => {
      global.fetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByText(/This may take a few seconds/)).toBeInTheDocument();
      });
    });

    test('should display skeleton loading placeholders', async () => {
      global.fetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

      render(<SchemaPage />);

      await waitFor(() => {
        const skeletons = screen.queryAllByText('');
        // Check if loading animation is present
        expect(screen.getByTestId('loading-animation')).toBeInTheDocument();
      });
    });

    test('should hide loading state after diagram loads', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.queryByText('Rendering schema diagram')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should display error message on API failure', async () => {
      const errorMessage = 'Failed to fetch diagram';

      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: errorMessage })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(errorMessage))).toBeInTheDocument();
      });
    });

    test('should display default error message when no error provided', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({})
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load schema diagram/)).toBeInTheDocument();
      });
    });

    test('should display network error message on fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    test('should display retry button on error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      });
    });

    test('should show helpful hint on error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByText(/Try again/)).toBeInTheDocument();
        expect(screen.getByText(/check your database connection/)).toBeInTheDocument();
      });
    });
  });

  describe('Retry Functionality', () => {
    test('should retry fetching diagram when retry button clicked', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      });

      // Reset mock for retry
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    test('should clear error on successful retry', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.queryByText(/Network error/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Diagram Display', () => {
    test('should display schema diagram image', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\nClass User\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        const img = screen.getByAltText('Schema Diagram');
        expect(img).toBeInTheDocument();
      });
    });

    test('should display placeholder image when no URL available', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        const img = screen.getByAltText('Schema Diagram');
        expect(img.src).toContain('placeholder.png');
      });
    });

    test('should have correct alt text for diagram image', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        const img = screen.getByAltText('Schema Diagram');
        expect(img).toBeInTheDocument();
      });
    });

    test('should have responsive image styling', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        const img = screen.getByAltText('Schema Diagram');
        expect(img).toHaveStyle({ width: '100%', height: 'auto', maxWidth: '100%' });
      });
    });
  });

  describe('Zoom Controls', () => {
    test('should render zoom in button', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        const zoomInBtn = screen.getByRole('button', { name: /Zoom In/ });
        expect(zoomInBtn).toBeInTheDocument();
      });
    });

    test('should render zoom out button', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        const zoomOutBtn = screen.getByRole('button', { name: /Zoom Out/ });
        expect(zoomOutBtn).toBeInTheDocument();
      });
    });

    test('should render reset button', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        const resetBtn = screen.getByRole('button', { name: /Reset/ });
        expect(resetBtn).toBeInTheDocument();
      });
    });

    test('should have proper styling for zoom buttons', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        const zoomInBtn = screen.getByRole('button', { name: /Zoom In/ });
        expect(zoomInBtn).toHaveClass('bg-blue-500', 'text-white', 'rounded');
      });
    });

    test('should have hover effect on zoom buttons', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        const zoomInBtn = screen.getByRole('button', { name: /Zoom In/ });
        expect(zoomInBtn).toHaveClass('hover:bg-blue-600');
      });
    });

    test('should have different styling for reset button', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        const resetBtn = screen.getByRole('button', { name: /Reset/ });
        expect(resetBtn).toHaveClass('bg-gray-500');
      });
    });
  });

  describe('UML Encoding', () => {
    test('should encode UML code for PlantUML URL', async () => {
      const testUML = '@startuml\nClass User\n@enduml';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: testUML })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByAltText('Schema Diagram')).toBeInTheDocument();
      });
    });
  });

  describe('Component Layout', () => {
    test('should have main container with proper spacing', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      const { container } = render(<SchemaPage />);

      const mainDiv = container.querySelector('.w-full.h-full.p-4');
      expect(mainDiv).toBeInTheDocument();
    });

    test('should have white background card', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      const { container } = render(<SchemaPage />);

      const card = container.querySelector('.bg-white.rounded-lg.shadow-lg');
      expect(card).toBeInTheDocument();
    });

    test('should display title in card header', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      const title = screen.getByText('Database Schema Diagram');
      expect(title).toHaveClass('text-2xl', 'font-bold', 'mb-4');
    });
  });

  describe('Tips Section', () => {
    test('should display all tips', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByText(/Use mouse wheel or pinch gesture to zoom/)).toBeInTheDocument();
        expect(screen.getByText(/Click and drag to pan around the diagram/)).toBeInTheDocument();
        expect(screen.getByText(/Use the controls above to zoom in/)).toBeInTheDocument();
      });
    });

    test('should display tips in list format', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      const { container } = render(<SchemaPage />);

      await waitFor(() => {
        const list = container.querySelector('.list-disc');
        expect(list).toBeInTheDocument();
      });
    });
  });

  describe('Transform Wrapper', () => {
    test('should render transform wrapper for zoom/pan', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByTestId('transform-wrapper')).toBeInTheDocument();
      });
    });

    test('should render transform component inside wrapper', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByTestId('transform-component')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long UML code', async () => {
      const longUML = '@startuml\n' + 'Class Test' + '\n'.repeat(100) + '@enduml';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: longUML })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByAltText('Schema Diagram')).toBeInTheDocument();
      });
    });

    test('should handle special characters in UML', async () => {
      const specialUML = '@startuml\nClass "User_Data@V2" { }\n@enduml';

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: specialUML })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByAltText('Schema Diagram')).toBeInTheDocument();
      });
    });

    test('should handle empty UML response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plantuml: '' })
      });

      render(<SchemaPage />);

      await waitFor(() => {
        const img = screen.getByAltText('Schema Diagram');
        expect(img.src).toContain('placeholder.png');
      });
    });

    test('should handle rapid retry clicks', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<SchemaPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Retry/i });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ plantuml: '@startuml\n@enduml' })
      });

      fireEvent.click(retryButton);
      fireEvent.click(retryButton);

      await waitFor(() => {
        // First call: initial mount (fails), Second call: first retry (succeeds)
        // Second retry click is ignored because button is disabled during loading
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
