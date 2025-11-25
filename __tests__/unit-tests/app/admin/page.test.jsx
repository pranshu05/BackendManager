import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminPage from '@/app/admin/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
}));

// Mock next-auth
jest.mock('next-auth/react', () => ({
    useSession: () => ({
        data: { user: { email: 'admin@test.com', role: 'admin' } },
        status: 'authenticated',
    }),
}));

// Mock components
jest.mock('@/components/(admin)/AdminStatsDashboard', () => ({
    __esModule: true,
    default: () => <div data-testid="admin-stats-dashboard">Admin Stats</div>,
}));

jest.mock('@/components/(admin)/AdminTicketsList', () => ({
    __esModule: true,
    default: () => <div data-testid="admin-tickets-list">Admin Tickets</div>,
}));

// Mock UI components
jest.mock('@/components/ui/header', () => ({
    __esModule: true,
    default: () => <div data-testid="header">Header</div>,
}));

jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ children }) => <div data-testid="tabs">{children}</div>,
    TabsList: ({ children }) => <div data-testid="tabs-list">{children}</div>,
    TabsTrigger: ({ children }) => <div data-testid="tabs-trigger">{children}</div>,
    TabsContent: ({ children }) => <div data-testid="tabs-content">{children}</div>,
}));

describe('Admin Page', () => {
    test('should render without crashing', () => {
        const { container } = render(<AdminPage />);
        expect(container).toBeInTheDocument();
    });
});
