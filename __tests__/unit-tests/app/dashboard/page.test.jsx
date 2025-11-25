import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '@/app/dashboard/page';

// Mock components
jest.mock('@/components/(dashboard)/ProjectCard', () => ({
    __esModule: true,
    default: () => <div data-testid="project-card">Project Card</div>,
}));

jest.mock('@/components/(dashboard)/ImportDatabase', () => ({
    __esModule: true,
    default: () => <div data-testid="import-database">Import Database</div>,
}));

jest.mock('@/components/(dashboard)/MockDataGenerator', () => ({
    __esModule: true,
    default: () => <div data-testid="mock-data-generator">Mock Data Generator</div>,
}));

describe('Dashboard Page', () => {
    test('should render without crashing', () => {
        const { container } = render(<DashboardPage />);
        expect(container).toBeInTheDocument();
    });
});
