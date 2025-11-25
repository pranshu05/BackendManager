import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfilePage from '@/app/profile/page';

// Mock components
jest.mock('@/components/(profile)/ProfileHeader', () => ({
    __esModule: true,
    default: () => <div data-testid="profile-header">Profile Header</div>,
}));

jest.mock('@/components/(profile)/ProfileAvatar', () => ({
    __esModule: true,
    default: () => <div data-testid="profile-avatar">Profile Avatar</div>,
}));

jest.mock('@/components/(profile)/GeneralInfoSection', () => ({
    __esModule: true,
    default: () => <div data-testid="general-info-section">General Info</div>,
}));

jest.mock('@/components/(profile)/ContactInfoSection', () => ({
    __esModule: true,
    default: () => <div data-testid="contact-info-section">Contact Info</div>,
}));

jest.mock('@/components/(profile)/PasswordUpdateSection', () => ({
    __esModule: true,
    default: () => <div data-testid="password-update-section">Password Update</div>,
}));

jest.mock('@/components/(profile)/APITokenSection', () => ({
    __esModule: true,
    default: () => <div data-testid="api-token-section">API Token</div>,
}));

jest.mock('@/components/(profile)/LogoutButton', () => ({
    __esModule: true,
    default: () => <div data-testid="logout-button">Logout</div>,
}));

describe('Profile Page', () => {
    test('should render without crashing', () => {
        const { container } = render(<ProfilePage />);
        expect(container).toBeInTheDocument();
    });
});
