import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import RootLayout from '@/app/layout';

// Mock next/font/google
jest.mock('next/font/google', () => ({
    Space_Grotesk: () => ({
        variable: '--font-space-grotesk',
        className: 'font-space-grotesk',
    }),
}));

// Mock AuthProvider
jest.mock('@/components/AuthProvider', () => ({
    __esModule: true,
    default: ({ children }) => <div data-testid="auth-provider">{children}</div>,
}));

describe('Root Layout', () => {
    test('should render children within layout', () => {
        const { getByText, getByTestId } = render(
            <RootLayout>
                <div>Test Content</div>
            </RootLayout>
        );
        
        expect(getByTestId('auth-provider')).toBeInTheDocument();
        expect(getByText('Test Content')).toBeInTheDocument();
    });
});
