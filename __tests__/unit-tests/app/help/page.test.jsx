import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelpPage from '@/app/help/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
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

// Mock components
jest.mock('@/components/(help)/FAQsSection', () => ({
    __esModule: true,
    default: () => <div data-testid="faqs-section">FAQs</div>,
}));

jest.mock('@/components/(help)/SupportSection', () => ({
    __esModule: true,
    default: () => <div data-testid="support-section">Support</div>,
}));

describe('Help Page', () => {
    test('should render without crashing', () => {
        const { container } = render(<HelpPage />);
        expect(container).toBeInTheDocument();
    });
});
