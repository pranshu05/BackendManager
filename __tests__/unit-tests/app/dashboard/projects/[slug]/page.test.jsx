import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectPage from '@/app/dashboard/projects/[slug]/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useParams: () => ({ slug: 'test-project-123' }),
}));

// Mock components
jest.mock('@/components/(projects)/schema', () => ({
    __esModule: true,
    default: () => <div data-testid="schema">Schema</div>,
}));

jest.mock('@/components/(projects)/query', () => ({
    __esModule: true,
    default: () => <div data-testid="query">Query</div>,
}));

jest.mock('@/components/(projects)/history', () => ({
    __esModule: true,
    default: () => <div data-testid="history">History</div>,
}));

jest.mock('@/components/(projects)/optimization', () => ({
    __esModule: true,
    default: () => <div data-testid="optimization">Optimization</div>,
}));

jest.mock('@/components/(projects)/summary_card', () => ({
    __esModule: true,
    default: () => <div data-testid="summary-card">Summary Card</div>,
}));

describe('Project Page', () => {
    test('should render without crashing', () => {
        const { container } = render(<ProjectPage />);
        expect(container).toBeInTheDocument();
    });
});
