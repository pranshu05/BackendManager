import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// mock next/navigation useRouter so we can inspect pushes
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

// Mock header and child admin components to keep test focused
jest.mock('@/components/ui/header', () => () => <div>Header</div>);
jest.mock('@/components/(admin)/AdminTicketsList', () => () => <div>AdminTicketsList</div>);
jest.mock('@/components/(admin)/AdminStatsDashboard', () => () => <div>AdminStatsDashboard</div>);

// Simple Tabs mocks used by page.jsx
jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }) => <div>{children}</div>,
  TabsList: ({ children }) => <div>{children}</div>,
  TabsTrigger: ({ children }) => <button>{children}</button>,
  TabsContent: ({ children }) => <div>{children}</div>
}));

// Mock icons used in the page
jest.mock('lucide-react', () => ({
  Shield: () => <div data-testid="icon-shield" />,
  Ticket: () => <div data-testid="icon-ticket" />,
  BarChart3: () => <div data-testid="icon-stats" />,
  RefreshCw: () => <div data-testid="icon-refresh" />,
  X: () => <div data-testid="icon-x" />
}));

// Import the page under test
import AdminPage from '@/app/admin/page';

describe('AdminPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  test('shows verifying admin access while loading', async () => {
    // make fetch hang so component stays in loading state
    global.fetch = jest.fn(() => new Promise(() => {}));

    render(<AdminPage />);

    expect(screen.getByText(/Verifying admin access.../i)).toBeInTheDocument();
  });

  test('redirects to dashboard when user is not admin', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ isAdmin: false }) }));

    render(<AdminPage />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });

  test('redirects to root when response not ok', async () => {
    global.fetch = jest.fn(async () => ({ ok: false }));

    render(<AdminPage />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  test('redirects to root on fetch error', async () => {
    global.fetch = jest.fn(() => { throw new Error('network'); });

    render(<AdminPage />);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/'));
  });

  test('renders admin UI when user is admin', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ isAdmin: true }) }));

    render(<AdminPage />);

    // Wait for child components to be rendered
    await waitFor(() => expect(screen.getByText('Admin Panel')).toBeInTheDocument());
    expect(screen.getByText('AdminStatsDashboard')).toBeInTheDocument();
    expect(screen.getByText('AdminTicketsList')).toBeInTheDocument();
    // Header should render always
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  test('clicking close navigates to /help', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ isAdmin: true }) }));

    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText('Admin Panel')).toBeInTheDocument());

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/help'));
  });
});
