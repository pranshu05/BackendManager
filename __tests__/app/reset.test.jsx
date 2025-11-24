import React from 'react';
import { render, screen } from '@testing-library/react';
import ResetPage from '@/app/reset/page';

// Mock the forgot password component to keep tests focused on the page layout
jest.mock('@/components/(auth)/forgotpwd', () => {
  return function MockForgotpwd() {
    return <div data-testid="mock-forgotpwd">Forgotpwd Component</div>;
  };
});

describe('Reset Page (app/reset/page.jsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders left and right sections and content', () => {
    const { container } = render(<ResetPage />);

    // Left side: Branding and marketing copy
    expect(screen.getByText('DBuddy')).toBeInTheDocument();
    expect(screen.getByText('Your Database Companion')).toBeInTheDocument();
    expect(screen.getByText('Create databases with natural language')).toBeInTheDocument();
    expect(screen.getByText(/No more complex SQL queries/i)).toBeInTheDocument();

    // Features present
    expect(screen.getByText('AI-Powered Creation')).toBeInTheDocument();
    expect(screen.getByText('One-Click Deployment')).toBeInTheDocument();
    expect(screen.getByText('Smart Queries')).toBeInTheDocument();

    // Right side: Card content and mocked Forgotpwd
    expect(screen.getByText('Forgot your Password?')).toBeInTheDocument();
    expect(screen.getByText("No Worries!! We'll help you reset it.")).toBeInTheDocument();
    expect(screen.getByTestId('mock-forgotpwd')).toBeInTheDocument();

    // Basic structure checks (grid and container classes used by the component)
    const grid = container.querySelector('div.grid');
    expect(grid).toBeInTheDocument();

    const card = container.querySelector('.max-w-md');
    expect(card).toBeInTheDocument();
  });
});
