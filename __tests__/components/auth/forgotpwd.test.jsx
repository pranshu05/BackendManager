import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Forgotpwd from '@/components/(auth)/forgotpwd';
import * as authHelpers from '@/lib/auth-helpers';

// Mock auth-helpers
jest.mock('@/lib/auth-helpers');

// Mock UI components
jest.mock('@/components/ui/input', () => ({
    Input: ({ type, placeholder, value, onChange, className }) => (
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={className}
            data-testid={`input-${placeholder}`}
        />
    ),
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, type, className }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            type={type}
            className={className}
            data-testid="button"
        >
            {children}
        </button>
    ),
}));

jest.mock('lucide-react', () => ({
    Eye: ({ className }) => <div data-testid="icon-eye" className={className} />,
    EyeOff: ({ className }) => <div data-testid="icon-eye-off" className={className} />,
}));

describe('forgotpwd Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.alert = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ===== Email Verification Form Tests =====
    test('renders email verification form initially', () => {
        render(<Forgotpwd />);
        
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Verify/i })).toBeInTheDocument();
    });

    test('email input updates on change', () => {
        render(<Forgotpwd />);
        
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        
        expect(emailInput).toHaveValue('test@example.com');
    });

    test('email form submit calls checkemail and transitions to OTP form on success', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        
        render(<Forgotpwd />);
        
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const submitButton = screen.getByRole('button', { name: /Verify/i });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(authHelpers.checkemail).toHaveBeenCalledWith({ email: 'test@example.com' });
        });
        
        // Should transition to OTP form
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
    });

    test('email form shows error message on checkemail failure', async () => {
        authHelpers.checkemail.mockRejectedValueOnce(new Error('Email not found'));
        
        render(<Forgotpwd />);
        
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const submitButton = screen.getByRole('button', { name: /Verify/i });
        
        fireEvent.change(emailInput, { target: { value: 'notfound@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Email not found')).toBeInTheDocument();
        });
    });

    test('email form button shows loading state', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        authHelpers.checkemail.mockReturnValueOnce(promise);
        
        render(<Forgotpwd />);
        
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const submitButton = screen.getByRole('button', { name: /Verify/i });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Verifying/i })).toBeInTheDocument();
        });
        
        resolvePromise({ success: true });
    });

    // ===== OTP Verification Form Tests =====
    test('renders OTP form after successful email verification', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        
        render(<Forgotpwd />);
        
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const submitButton = screen.getByRole('button', { name: /Verify/i });
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('OTP')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
    });

    test('OTP input updates on change', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        
        render(<Forgotpwd />);
        
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: '123456' } });
        
        expect(otpInput).toHaveValue('123456');
    });

    test('OTP form submit calls otpcheck and transitions to password form on success', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        authHelpers.otpcheck.mockResolvedValueOnce({ success: true });
        
        render(<Forgotpwd />);
        
        // First, fill and submit email form
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        // Now fill and submit OTP form
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: '123456' } });
        const otpSubmitButton = screen.getByRole('button', { name: /Verify/i });
        fireEvent.click(otpSubmitButton);
        
        await waitFor(() => {
            expect(authHelpers.otpcheck).toHaveBeenCalledWith({ email: 'test@example.com', otp: '123456' });
            expect(window.alert).toHaveBeenCalledWith('OTP verified Successfully!!');
        });
        
        // Should transition to password reset form
        await waitFor(() => {
            expect(screen.getByText('New Password')).toBeInTheDocument();
        });
    });

    test('OTP form shows error message on otpcheck failure', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        authHelpers.otpcheck.mockRejectedValueOnce(new Error('Invalid OTP'));
        
        render(<Forgotpwd />);
        
        // First, fill and submit email form
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        // Now fill and submit OTP form with wrong OTP
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: 'wrongotp' } });
        const otpSubmitButton = screen.getByRole('button', { name: /Verify/i });
        fireEvent.click(otpSubmitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Invalid OTP')).toBeInTheDocument();
        });
    });

    test('OTP form button shows loading state', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        authHelpers.otpcheck.mockReturnValueOnce(promise);
        
        render(<Forgotpwd />);
        
        // Fill and submit email form
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        // Submit OTP form
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: '123456' } });
        const otpSubmitButton = screen.getByRole('button', { name: /Verify/i });
        fireEvent.click(otpSubmitButton);
        
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Verifying/i })).toBeInTheDocument();
        });
        
        resolvePromise({ success: true });
    });

    // ===== Password Reset Form Tests =====
    test('renders password reset form after successful OTP verification', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        authHelpers.otpcheck.mockResolvedValueOnce({ success: true });
        
        render(<Forgotpwd />);
        
        // Fill and submit email form
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        // Fill and submit OTP form
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: '123456' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByText('New Password')).toBeInTheDocument();
            expect(screen.getByText('Confirm New Password')).toBeInTheDocument();
        });
    });

    test('password inputs update on change', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        authHelpers.otpcheck.mockResolvedValueOnce({ success: true });
        
        render(<Forgotpwd />);
        
        // Navigate to password reset form
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: '123456' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter New Password')).toBeInTheDocument();
        });
        
        // Test password input changes
        const newPasswordInput = screen.getByPlaceholderText('Enter New Password');
        const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
        
        fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123' } });
        
        expect(newPasswordInput).toHaveValue('NewPassword123');
        expect(confirmPasswordInput).toHaveValue('NewPassword123');
    });

    test('password reset shows error when passwords do not match', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        authHelpers.otpcheck.mockResolvedValueOnce({ success: true });
        
        render(<Forgotpwd />);
        
        // Navigate to password reset form
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: '123456' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter New Password')).toBeInTheDocument();
        });
        
        // Enter mismatched passwords
        const newPasswordInput = screen.getByPlaceholderText('Enter New Password');
        const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: /Reset Password/i });
        
        fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'DifferentPassword456' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
        });
        
        // resetPassword should not have been called
        expect(authHelpers.resetPassword).not.toHaveBeenCalled();
    });

    test('password reset calls resetPassword on success with matching passwords', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        authHelpers.otpcheck.mockResolvedValueOnce({ success: true });
        authHelpers.resetPassword.mockResolvedValueOnce({ success: true });
        
        render(<Forgotpwd />);
        
        // Navigate to password reset form
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: '123456' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter New Password')).toBeInTheDocument();
        });
        
        // Enter matching passwords
        const newPasswordInput = screen.getByPlaceholderText('Enter New Password');
        const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: /Reset Password/i });
        
        fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(authHelpers.resetPassword).toHaveBeenCalledWith({
                email: 'test@example.com',
                newpwd: 'NewPassword123',
                confirmPassword: 'NewPassword123',
            });
            expect(window.alert).toHaveBeenCalledWith('Password updated Successfully!!');
        });
    });

    test('password reset shows error on resetPassword failure', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        authHelpers.otpcheck.mockResolvedValueOnce({ success: true });
        authHelpers.resetPassword.mockRejectedValueOnce(new Error('Failed to update password'));
        
        render(<Forgotpwd />);
        
        // Navigate to password reset form
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: '123456' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter New Password')).toBeInTheDocument();
        });
        
        // Enter passwords and submit
        const newPasswordInput = screen.getByPlaceholderText('Enter New Password');
        const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
        const submitButton = screen.getByRole('button', { name: /Reset Password/i });
        
        fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Failed to update password')).toBeInTheDocument();
        });
    });

    // ===== Password Visibility Toggle Tests =====
    test('password visibility toggle switches input type', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        authHelpers.otpcheck.mockResolvedValueOnce({ success: true });
        
        render(<Forgotpwd />);
        
        // Navigate to password reset form
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: '123456' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter New Password')).toBeInTheDocument();
        });
        
        // Find password toggle buttons - they should be before the first Eye/EyeOff icons
        const passwordToggles = screen.getAllByRole('button').filter(btn => 
            btn.getAttribute('type') === 'button' && 
            btn.querySelector('[data-testid="icon-eye"], [data-testid="icon-eye-off"]')
        );
        
        const newPasswordToggle = passwordToggles[0];
        
        // Initial state: password type
        const newPasswordInput = screen.getByPlaceholderText('Enter New Password');
        expect(newPasswordInput).toHaveAttribute('type', 'password');
        
        // Click toggle to show password
        fireEvent.click(newPasswordToggle);
        expect(newPasswordInput).toHaveAttribute('type', 'text');
        
        // Click toggle again to hide password
        fireEvent.click(newPasswordToggle);
        expect(newPasswordInput).toHaveAttribute('type', 'password');
    });

    test('confirm password visibility toggle works independently', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        authHelpers.otpcheck.mockResolvedValueOnce({ success: true });
        
        render(<Forgotpwd />);
        
        // Navigate to password reset form
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: '123456' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter New Password')).toBeInTheDocument();
        });
        
        // Find both password toggle buttons
        const passwordToggles = screen.getAllByRole('button').filter(btn => 
            btn.getAttribute('type') === 'button' && 
            btn.querySelector('[data-testid="icon-eye"], [data-testid="icon-eye-off"]')
        );
        
        const newPasswordToggle = passwordToggles[0];
        const confirmPasswordToggle = passwordToggles[1];
        
        const newPasswordInput = screen.getByPlaceholderText('Enter New Password');
        const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
        
        // Show new password only
        fireEvent.click(newPasswordToggle);
        expect(newPasswordInput).toHaveAttribute('type', 'text');
        expect(confirmPasswordInput).toHaveAttribute('type', 'password');
        
        // Show confirm password
        fireEvent.click(confirmPasswordToggle);
        expect(newPasswordInput).toHaveAttribute('type', 'text');
        expect(confirmPasswordInput).toHaveAttribute('type', 'text');
        
        // Hide new password
        fireEvent.click(newPasswordToggle);
        expect(newPasswordInput).toHaveAttribute('type', 'password');
        expect(confirmPasswordInput).toHaveAttribute('type', 'text');
    });

    // ===== Error Display Tests =====
    test('error clears when user starts new form submission', async () => {
        authHelpers.checkemail.mockRejectedValueOnce(new Error('Email not found'));
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        
        render(<Forgotpwd />);
        
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const submitButton = screen.getByRole('button', { name: /Verify/i });
        
        // First attempt with error
        fireEvent.change(emailInput, { target: { value: 'notfound@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByText('Email not found')).toBeInTheDocument();
        });
        
        // Clear previous mock and set new one
        authHelpers.checkemail.mockClear();
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        
        // Second attempt should clear error
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.queryByText('Email not found')).not.toBeInTheDocument();
        });
    });

    // ===== Integration Tests =====
    test('complete flow from email to password reset', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        authHelpers.otpcheck.mockResolvedValueOnce({ success: true });
        authHelpers.resetPassword.mockResolvedValueOnce({ success: true });
        
        render(<Forgotpwd />);
        
        // Step 1: Email verification
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        // Step 2: OTP verification
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: '123456' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter New Password')).toBeInTheDocument();
        });
        
        // Step 3: Password reset
        const newPasswordInput = screen.getByPlaceholderText('Enter New Password');
        const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
        const resetButton = screen.getByRole('button', { name: /Reset Password/i });
        
        fireEvent.change(newPasswordInput, { target: { value: 'SecurePassword123!' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'SecurePassword123!' } });
        fireEvent.click(resetButton);
        
        await waitFor(() => {
            expect(authHelpers.resetPassword).toHaveBeenCalled();
            expect(window.alert).toHaveBeenCalledWith('Password updated Successfully!!');
        });
    });

    test('button disabled state during loading in email form', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        authHelpers.checkemail.mockReturnValueOnce(promise);
        
        render(<Forgotpwd />);
        
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const submitButton = screen.getByRole('button', { name: /Verify/i });
        
        expect(submitButton).not.toBeDisabled();
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Verifying/i })).toBeDisabled();
        });
        
        resolvePromise({ success: true });
    });

    test('button disabled state during loading in password form', async () => {
        authHelpers.checkemail.mockResolvedValueOnce({ success: true });
        authHelpers.otpcheck.mockResolvedValueOnce({ success: true });
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        authHelpers.resetPassword.mockReturnValueOnce(promise);
        
        render(<Forgotpwd />);
        
        // Navigate to password reset form
        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter the OTP sent to your email')).toBeInTheDocument();
        });
        
        const otpInput = screen.getByPlaceholderText('Enter the OTP sent to your email');
        fireEvent.change(otpInput, { target: { value: '123456' } });
        fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('Enter New Password')).toBeInTheDocument();
        });
        
        // Submit password form
        const newPasswordInput = screen.getByPlaceholderText('Enter New Password');
        const confirmPasswordInput = screen.getByPlaceholderText('Confirm New Password');
        const resetButton = screen.getByRole('button', { name: /Reset Password/i });
        
        fireEvent.change(newPasswordInput, { target: { value: 'NewPassword123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'NewPassword123' } });
        fireEvent.click(resetButton);
        
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Resetting/i })).toBeDisabled();
        });
        
        resolvePromise({ success: true });
    });
});
