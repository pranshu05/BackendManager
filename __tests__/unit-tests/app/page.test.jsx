import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Page from '@/app/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
    }),
}));

describe('Home Page', () => {
    test('should render without crashing', () => {
        const { container } = render(<Page />);
        expect(container).toBeInTheDocument();
    });
});
