import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainPage from '@/app/page';

// Mock child auth components
jest.mock('@/components/(auth)/LoginForm', () => {
  return function MockLoginForm() {
    return <div data-testid="mock-login">LoginForm Component</div>;
  };
});

jest.mock('@/components/(auth)/SignupForm', () => {
  return function MockSignupForm() {
    return <div data-testid="mock-signup">SignupForm Component</div>;
  };
});

describe('Main app landing page (app/page.jsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders left showcase text and right auth card with login tab active by default', async () => {
    render(<MainPage />);

    // left side
    expect(screen.getByText('DBuddy')).toBeInTheDocument();
    expect(screen.getByText('Your Database Companion')).toBeInTheDocument();
    expect(screen.getByText('Create databases with natural language')).toBeInTheDocument();
    expect(screen.getByText(/No more complex SQL queries/i)).toBeInTheDocument();

    // features
    expect(screen.getByText('AI-Powered Creation')).toBeInTheDocument();
    expect(screen.getByText('One-Click Deployment')).toBeInTheDocument();
    expect(screen.getByText('Smart Queries')).toBeInTheDocument();

    // right side card
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account or create a new one')).toBeInTheDocument();

    // default tab should be login and mocked LoginForm mounted
    expect(screen.getByTestId('mock-login')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-signup')).not.toBeInTheDocument();

    // click Sign Up and the SignupForm should render
    await userEvent.click(screen.getByText('Sign Up'));
    expect(screen.getByTestId('mock-signup')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-login')).not.toBeInTheDocument();
  });
});
