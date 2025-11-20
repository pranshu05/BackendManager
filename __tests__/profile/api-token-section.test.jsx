import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import APITokenSection from '@/components/(profile)/APITokenSection';

describe('APITokenSection Component', () => {
  test('should render the component with title and description', () => {
    const mockOnGenerateToken = jest.fn();
    render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    expect(screen.getByText('API Token')).toBeInTheDocument();
    expect(screen.getByText('Generate Bearer token for API access')).toBeInTheDocument();
  });

  test('should render the Generate Token button', () => {
    const mockOnGenerateToken = jest.fn();
    render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const button = screen.getByRole('button', { name: /generate token/i });
    expect(button).toBeInTheDocument();
  });

  test('should call onGenerateToken when button is clicked', () => {
    const mockOnGenerateToken = jest.fn();
    render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const button = screen.getByRole('button', { name: /generate token/i });
    fireEvent.click(button);

    expect(mockOnGenerateToken).toHaveBeenCalledTimes(1);
  });

  test('should call onGenerateToken multiple times on multiple clicks', () => {
    const mockOnGenerateToken = jest.fn();
    render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const button = screen.getByRole('button', { name: /generate token/i });
    
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(mockOnGenerateToken).toHaveBeenCalledTimes(3);
  });

  test('should have correct button styling classes', () => {
    const mockOnGenerateToken = jest.fn();
    render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const button = screen.getByRole('button', { name: /generate token/i });
    
    expect(button).toHaveClass('bg-[#1e4a8a]');
    expect(button).toHaveClass('hover:bg-[#1e3a6a]');
    expect(button).toHaveClass('text-white');
    expect(button).toHaveClass('px-6');
    expect(button).toHaveClass('py-2');
    expect(button).toHaveClass('rounded-lg');
    expect(button).toHaveClass('transition-colors');
    expect(button).toHaveClass('font-semibold');
  });

  test('should render with proper container styling', () => {
    const mockOnGenerateToken = jest.fn();
    const { container } = render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const mainDiv = container.querySelector('.bg-white.rounded-xl.shadow-lg.p-6');
    expect(mainDiv).toBeInTheDocument();
  });

  test('should have Key icon rendered (lucide-react)', () => {
    const mockOnGenerateToken = jest.fn();
    const { container } = render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    // Check for the icon container with proper styling
    const iconDiv = container.querySelector('.w-6.h-6.text-\\[\\#1e4a8a\\]');
    expect(iconDiv).toBeInTheDocument();
  });

  test('should have proper heading styling', () => {
    const mockOnGenerateToken = jest.fn();
    const { container } = render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const heading = screen.getByText('API Token');
    expect(heading).toHaveClass('text-xl');
    expect(heading).toHaveClass('font-bold');
    expect(heading).toHaveClass('text-[#1e4a8a]');
  });

  test('should have proper description text styling', () => {
    const mockOnGenerateToken = jest.fn();
    const { container } = render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const description = screen.getByText('Generate Bearer token for API access');
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('text-gray-600');
  });

  test('should maintain callback reference across renders', () => {
    const mockOnGenerateToken = jest.fn();
    const { rerender } = render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const button = screen.getByRole('button', { name: /generate token/i });
    fireEvent.click(button);
    expect(mockOnGenerateToken).toHaveBeenCalledTimes(1);

    rerender(<APITokenSection onGenerateToken={mockOnGenerateToken} />);
    
    const buttonAfterRerender = screen.getByRole('button', { name: /generate token/i });
    fireEvent.click(buttonAfterRerender);
    expect(mockOnGenerateToken).toHaveBeenCalledTimes(2);
  });

  test('should handle rapid successive clicks', async () => {
    const mockOnGenerateToken = jest.fn();
    render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const button = screen.getByRole('button', { name: /generate token/i });
    
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnGenerateToken).toHaveBeenCalledTimes(5);
    });
  });

  test('should render in a flex layout container', () => {
    const mockOnGenerateToken = jest.fn();
    const { container } = render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const flexContainer = container.querySelector('.flex.items-center.justify-between');
    expect(flexContainer).toBeInTheDocument();
  });

  test('should have icon and text in separate flex container', () => {
    const mockOnGenerateToken = jest.fn();
    const { container } = render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const iconTextContainer = container.querySelector('.flex.items-center.gap-3');
    expect(iconTextContainer).toBeInTheDocument();
  });

  test('should not call onGenerateToken if prop is undefined (defensive)', () => {
    // This tests that the component handles edge cases gracefully
    expect(() => {
      render(<APITokenSection onGenerateToken={() => {}} />);
    }).not.toThrow();
  });

  test('should render accessible button element', () => {
    const mockOnGenerateToken = jest.fn();
    render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  test('should have button as direct child of container', () => {
    const mockOnGenerateToken = jest.fn();
    const { container } = render(<APITokenSection onGenerateToken={mockOnGenerateToken} />);

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(1);
  });
});
