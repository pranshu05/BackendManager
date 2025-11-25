import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResetPage from '@/app/reset/page';

// Mock components
jest.mock('@/components/(auth)/forgotpwd', () => ({
    __esModule: true,
    default: () => <div data-testid="forgot-password">Forgot Password</div>,
}));

describe('Reset Page', () => {
    test('should render without crashing', () => {
        const { container } = render(<ResetPage />);
        expect(container).toBeInTheDocument();
    });
});
