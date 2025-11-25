import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpPage from '@/app/help/page';

// Mock Header (app layout child)
jest.mock('@/components/ui/header', () => {
  return function MockHeader() {
    return <div data-testid="mock-header">Mock Header</div>;
  };
});

// Mock the FAQs and Support sections so tests focus on page behavior
jest.mock('@/components/(help)/FAQsSection', () => {
  return function MockFAQsSection() {
    return <div data-testid="mock-faqs">FAQs Section</div>;
  };
});

jest.mock('@/components/(help)/SupportSection', () => {
  return function MockSupportSection() {
    return <div data-testid="mock-support">Support Section</div>;
  };
});

// Mock next/navigation useRouter push
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

describe('HelpPage (app/help/page.jsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders header, title and tabs', () => {
    render(<HelpPage />);

    expect(screen.getByTestId('mock-header')).toBeInTheDocument();

    // page title
    expect(screen.getByText('Help & Support')).toBeInTheDocument();

    // tabs triggers present
    expect(screen.getByText('FAQs & Tutorials')).toBeInTheDocument();
    expect(screen.getByText('Support Tickets')).toBeInTheDocument();

    // initial (default) tab should show the mocked FAQsSection
    expect(screen.getByTestId('mock-faqs')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-support')).not.toBeInTheDocument();
  });

  test('switches to Support tab when clicked and shows support section', async () => {
    render(<HelpPage />);

    // click the Support tab trigger (use userEvent to simulate a real user)
    await userEvent.click(screen.getByText('Support Tickets'));

    // support should be visible and faqs should be gone
    expect(screen.getByTestId('mock-support')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-faqs')).not.toBeInTheDocument();
  });

  test('close button navigates back to /dashboard', () => {
    render(<HelpPage />);

    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });
});
