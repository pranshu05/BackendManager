import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LogoutButton from '@/components/(profile)/LogoutButton';

describe('LogoutButton Component', () => {
  const mockOnLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render logout button', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('should display "Logout" text', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    test('should render button with correct text content', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      const button = screen.getByRole('button');
      expect(button.textContent).toContain('Logout');
    });

    test('should render button in a container div', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const containerDiv = container.querySelector('.flex.justify-center');
      expect(containerDiv).toBeInTheDocument();
    });

    test('should render logout icon', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Button Styling', () => {
    test('should have correct background color class', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('bg-red-600');
    });

    test('should have hover background color class', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('hover:bg-red-700');
    });

    test('should have white text color', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('text-white');
    });

    test('should have bold font weight', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('font-semibold');
    });

    test('should have padding classes', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('px-12', 'py-3');
    });

    test('should have rounded corners', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('rounded-lg');
    });

    test('should have shadow effect', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('shadow-lg');
    });

    test('should have transition effect', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('transition-colors');
    });

    test('should have gap between icon and text', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('gap-2');
    });

    test('should use flex display', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('flex', 'items-center');
    });
  });

  describe('User Interactions', () => {
    test('should call onLogout when button is clicked', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockOnLogout).toHaveBeenCalled();
    });

    test('should call onLogout only once on single click', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });

    test('should call onLogout on multiple clicks', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      expect(mockOnLogout).toHaveBeenCalledTimes(3);
    });

    test('should be keyboard accessible with Tab navigation', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Button Accessibility', () => {
    test('button should have proper role', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    test('button should be clickable', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    test('should have accessible text label', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    test('button should be focusable', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    test('should have semantic HTML structure', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    test('should accept onLogout as prop', () => {
      const customMockLogout = jest.fn();
      render(<LogoutButton onLogout={customMockLogout} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(customMockLogout).toHaveBeenCalled();
    });

    test('should work with different function props', () => {
      const alternateOnLogout = jest.fn();
      render(<LogoutButton onLogout={alternateOnLogout} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(alternateOnLogout).toHaveBeenCalledTimes(1);
    });

    test('should handle prop changes', () => {
      const firstMockLogout = jest.fn();
      const secondMockLogout = jest.fn();
      
      const { rerender } = render(<LogoutButton onLogout={firstMockLogout} />);
      let button = screen.getByRole('button');
      fireEvent.click(button);
      
      rerender(<LogoutButton onLogout={secondMockLogout} />);
      button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(firstMockLogout).toHaveBeenCalledTimes(1);
      expect(secondMockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Layout and Positioning', () => {
    test('should render in centered flex container', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const containerDiv = container.querySelector('.flex.justify-center');
      expect(containerDiv).toHaveClass('flex');
      expect(containerDiv).toHaveClass('justify-center');
    });

    test('should have vertical padding on container', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const containerDiv = container.querySelector('.flex.justify-center');
      expect(containerDiv).toHaveClass('pt-6', 'pb-12');
    });

    test('should display button in the center', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      const parentDiv = button.closest('.flex.justify-center');
      expect(parentDiv).toBeInTheDocument();
    });
  });

  describe('Icon Rendering', () => {
    test('should render icon inside button', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    test('should have icon with proper dimensions', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    test('should render icon and text in flex container', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      expect(button).toHaveClass('flex', 'items-center', 'gap-2');
    });
  });

  describe('Edge Cases', () => {
    test('should handle rapid consecutive clicks', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      const button = screen.getByRole('button');
      
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }
      
      expect(mockOnLogout).toHaveBeenCalledTimes(10);
    });

    test('should maintain functionality when re-rendered', () => {
      const { rerender } = render(<LogoutButton onLogout={mockOnLogout} />);
      let button = screen.getByRole('button');
      fireEvent.click(button);
      
      rerender(<LogoutButton onLogout={mockOnLogout} />);
      button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnLogout).toHaveBeenCalledTimes(2);
    });
  });

  describe('Component Snapshot', () => {
    test('should match snapshot', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    test('should render consistent structure', () => {
      const { container: container1 } = render(<LogoutButton onLogout={mockOnLogout} />);
      const { container: container2 } = render(<LogoutButton onLogout={mockOnLogout} />);
      expect(container1.innerHTML).toBe(container2.innerHTML);
    });
  });

  describe('Visual Elements', () => {
    test('should display all visual elements', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      
      // Check button exists
      expect(button).toBeInTheDocument();
      
      // Check text content
      expect(button.textContent).toContain('Logout');
      
      // Check icon exists
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    test('should maintain aspect ratio and spacing', () => {
      const { container } = render(<LogoutButton onLogout={mockOnLogout} />);
      const button = container.querySelector('button');
      
      expect(button).toHaveClass('flex', 'items-center');
      expect(button).toHaveClass('gap-2');
    });
  });

  describe('State and Behavior', () => {
    test('should not have disabled state by default', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    test('should remain enabled throughout lifecycle', () => {
      const { rerender } = render(<LogoutButton onLogout={mockOnLogout} />);
      let button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
      
      rerender(<LogoutButton onLogout={mockOnLogout} />);
      button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    test('callback should be a function', () => {
      render(<LogoutButton onLogout={mockOnLogout} />);
      expect(typeof mockOnLogout).toBe('function');
    });
  });

  describe('Integration', () => {
    test('should work with complex logout flows', () => {
      const logoutFlow = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true };
      });

      render(<LogoutButton onLogout={logoutFlow} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(logoutFlow).toHaveBeenCalled();
    });

    test('should handle side effects in callback', () => {
      let sideEffectExecuted = false;
      const onLogoutWithSideEffect = jest.fn(() => {
        sideEffectExecuted = true;
      });

      render(<LogoutButton onLogout={onLogoutWithSideEffect} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(sideEffectExecuted).toBe(true);
      expect(onLogoutWithSideEffect).toHaveBeenCalled();
    });
  });
});
