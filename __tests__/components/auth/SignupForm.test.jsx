import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignupForm from '@/components/(auth)/SignupForm';
import * as nextAuth from 'next-auth/react';
import * as authHelpers from '@/lib/auth-helpers';

// Mock next-auth
jest.mock('next-auth/react');

// Mock auth-helpers
jest.mock('@/lib/auth-helpers');

// Mock UI components
jest.mock('@/components/ui/input', () => ({
    Input: ({ type, placeholder, value, onChange, disabled, className }) => (
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={className}
            data-testid={`input-${placeholder}`}
        />
    ),
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, type, className, variant }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            type={type}
            className={className}
            data-variant={variant}
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

jest.mock('react-icons/fc', () => ({
    FcGoogle: ({ className }) => <div data-testid="icon-google" className={className} />,
}));

jest.mock('react-icons/fa', () => ({
    FaGithub: ({ className }) => <div data-testid="icon-github" className={className} />,
}));

describe('SignupForm Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    // ===== Initial Render Tests =====
    test('renders signup form with all required fields', () => {
        render(<SignupForm />);

        expect(screen.getByText('Full Name')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Password')).toBeInTheDocument();
        expect(screen.getByText('Confirm Password')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Create a password')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument();
    });

    test('renders create account button', () => {
        render(<SignupForm />);

        const createButton = screen.getByRole('button', { name: /Create Account/i });
        expect(createButton).toBeInTheDocument();
        expect(createButton).not.toBeDisabled();
    });

    test('renders OAuth buttons (Google and GitHub)', () => {
        render(<SignupForm />);

        expect(screen.getByTestId('icon-google')).toBeInTheDocument();
        expect(screen.getByTestId('icon-github')).toBeInTheDocument();
        expect(screen.getByText('Or continue with')).toBeInTheDocument();
    });

    // ===== Name Input Tests =====
    test('name input updates on change', () => {
        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        fireEvent.change(nameInput, { target: { value: 'John Doe' } });

        expect(nameInput).toHaveValue('John Doe');
    });

    // ===== Email Input Tests =====
    test('email input updates on change', () => {
        render(<SignupForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

        expect(emailInput).toHaveValue('test@example.com');
    });

    // ===== Password Input Tests =====
    test('password input updates on change', () => {
        render(<SignupForm />);

        const passwordInput = screen.getByPlaceholderText('Create a password');
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(passwordInput).toHaveValue('password123');
    });

    test('password input type is password by default', () => {
        render(<SignupForm />);

        const passwordInput = screen.getByPlaceholderText('Create a password');
        expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('confirm password input updates on change', () => {
        render(<SignupForm />);

        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        fireEvent.change(confirmInput, { target: { value: 'password123' } });

        expect(confirmInput).toHaveValue('password123');
    });

    // ===== Password Visibility Toggle Tests =====
    test('password visibility toggle switches input type', () => {
        render(<SignupForm />);

        const passwordInput = screen.getByPlaceholderText('Create a password');
        const toggleButtons = screen.getAllByRole('button').filter(btn =>
            btn.querySelector('[data-testid="icon-eye"], [data-testid="icon-eye-off"]')
        );

        const passwordToggle = toggleButtons[0];

        // Initial state: password type
        expect(passwordInput).toHaveAttribute('type', 'password');

        // Click toggle to show password
        fireEvent.click(passwordToggle);
        expect(passwordInput).toHaveAttribute('type', 'text');

        // Click toggle again to hide password
        fireEvent.click(passwordToggle);
        expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('confirm password visibility toggle switches input type', () => {
        render(<SignupForm />);

        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const toggleButtons = screen.getAllByRole('button').filter(btn =>
            btn.querySelector('[data-testid="icon-eye"], [data-testid="icon-eye-off"]')
        );

        const confirmToggle = toggleButtons[1];

        // Initial state: password type
        expect(confirmInput).toHaveAttribute('type', 'password');

        // Click toggle to show password
        fireEvent.click(confirmToggle);
        expect(confirmInput).toHaveAttribute('type', 'text');

        // Click toggle again to hide password
        fireEvent.click(confirmToggle);
        expect(confirmInput).toHaveAttribute('type', 'password');
    });

    test('password and confirm password toggles are independent', () => {
        render(<SignupForm />);

        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const toggleButtons = screen.getAllByRole('button').filter(btn =>
            btn.querySelector('[data-testid="icon-eye"], [data-testid="icon-eye-off"]')
        );

        // Show password only
        fireEvent.click(toggleButtons[0]);
        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(confirmInput).toHaveAttribute('type', 'password');

        // Show confirm only
        fireEvent.click(toggleButtons[0]); // Hide password
        fireEvent.click(toggleButtons[1]); // Show confirm
        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(confirmInput).toHaveAttribute('type', 'text');
    });

    // ===== Form Submission Tests =====
    test('form submit displays error when passwords do not match', async () => {
        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password456' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
        });

        expect(authHelpers.registerUser).not.toHaveBeenCalled();
    });

    test('form submit calls registerUser with correct data on success', async () => {
        authHelpers.registerUser.mockResolvedValueOnce({ success: true });

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(authHelpers.registerUser).toHaveBeenCalledWith({
                name: 'John Doe',
                email: 'test@example.com',
                password: 'password123',
                confirmPassword: 'password123',
            });
        });
    });

    test('form submit displays verification email sent message on success', async () => {
        authHelpers.registerUser.mockResolvedValueOnce({ success: true });

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Verification email sent/i)).toBeInTheDocument();
            expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
        });
    });

    test('form inputs are disabled after email sent', async () => {
        authHelpers.registerUser.mockResolvedValueOnce({ success: true });

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(nameInput).toBeDisabled();
            expect(emailInput).toBeDisabled();
            expect(passwordInput).toBeDisabled();
            expect(confirmInput).toBeDisabled();
        });
    });

    test('form submit displays loading state during registration', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        authHelpers.registerUser.mockReturnValueOnce(promise);

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Creating account/i })).toBeInTheDocument();
        });

        resolvePromise({ success: true });
    });

    test('form submit catches error and displays error message', async () => {
        authHelpers.registerUser.mockRejectedValueOnce(new Error('Email already exists'));

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Email already exists')).toBeInTheDocument();
        });
    });

    test('form submit handles rate limit error (429) and shows resend button', async () => {
        const rateLimitError = new Error('Too many requests');
        rateLimitError.statusCode = 429;
        rateLimitError.remainingTime = 0.5; // 30 seconds in minutes
        authHelpers.registerUser.mockRejectedValueOnce(rateLimitError);

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Verification email sent/i)).toBeInTheDocument();
        });
    });

    test('rate-limit with no remainingTime falls back to 120s cooldown', async () => {
        const rateLimitError = new Error('Too many requests');
        rateLimitError.statusCode = 429;
        // No remainingTime -> should use default 120 seconds
        authHelpers.registerUser.mockRejectedValueOnce(rateLimitError);

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'Fallback User' } });
        fireEvent.change(emailInput, { target: { value: 'fallback@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Verification email sent/i)).toBeInTheDocument();
        });

        // Should show the default 120 seconds cooldown
        const resendBtn = screen.getByRole('button', { name: /Resend in 120s/i });
        expect(resendBtn).toBeDisabled();
    });

    test('rate-limit cooldown from server counts down and enables resend', async () => {
        const rateLimitError = new Error('Too many requests');
        rateLimitError.statusCode = 429;
        // short remainingTime to make initialCooldown small (in minutes)
        rateLimitError.remainingTime = 0.02; // ~1.2 seconds -> ceil -> 2 seconds
        authHelpers.registerUser.mockRejectedValueOnce(rateLimitError);

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'John Rate' } });
        fireEvent.change(emailInput, { target: { value: 'rate@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        // Should show verification email state
        await waitFor(() => expect(screen.getByText(/Verification email sent/i)).toBeInTheDocument());

        // Initially the resend button should show the server cooldown and be disabled
        const resendBtn = screen.getByRole('button', { name: /Resend in/ });
        expect(resendBtn).toBeDisabled();

        // Fast-forward the small cooldown and expect the button to be enabled
        jest.advanceTimersByTime(2000);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Resend Verification Email/i })).not.toBeDisabled();
        });

        // Clicking resend should call registerUser again
        authHelpers.registerUser.mockResolvedValueOnce({ success: true });
        const resendEnabled = screen.getByRole('button', { name: /Resend Verification Email/i });
        fireEvent.click(resendEnabled);

        await waitFor(() => expect(authHelpers.registerUser).toHaveBeenCalled());
    });

    test('resend button shows cooldown timer', async () => {
        authHelpers.registerUser.mockResolvedValueOnce({ success: true });

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Verification email sent/i)).toBeInTheDocument();
        });

        // Check that resend button shows cooldown
        expect(screen.getByRole('button', { name: /Resend in/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Resend in/ })).toBeDisabled();
    });

    test('resend button becomes enabled after cooldown', async () => {
        authHelpers.registerUser.mockResolvedValueOnce({ success: true });

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Verification email sent/i)).toBeInTheDocument();
        });

        // Fast-forward 60 seconds
        jest.advanceTimersByTime(60000);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Resend Verification Email/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Resend Verification Email/i })).not.toBeDisabled();
        });
    });

    test('resend email calls registerUser again', async () => {
        authHelpers.registerUser.mockResolvedValueOnce({ success: true });

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Verification email sent/i)).toBeInTheDocument();
        });

        // Reset mock for resend
        authHelpers.registerUser.mockClear();
        authHelpers.registerUser.mockResolvedValueOnce({ success: true });

        // Fast-forward to enable resend
        jest.advanceTimersByTime(60000);

        const resendButton = await screen.findByRole('button', { name: /Resend Verification Email/i });
        fireEvent.click(resendButton);

        await waitFor(() => {
            expect(authHelpers.registerUser).toHaveBeenCalled();
        });
    });

    // ===== OAuth Button Tests =====
    test('Google OAuth button triggers signIn', async () => {
        nextAuth.signIn.mockResolvedValueOnce({});

        render(<SignupForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(nextAuth.signIn).toHaveBeenCalledWith('google', {
                callbackUrl: '/dashboard',
            });
        });
    });

    test('GitHub OAuth button triggers signIn', async () => {
        nextAuth.signIn.mockResolvedValueOnce({});

        render(<SignupForm />);

        const githubButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('GitHub')
        );

        fireEvent.click(githubButton);

        await waitFor(() => {
            expect(nextAuth.signIn).toHaveBeenCalledWith('github', {
                callbackUrl: '/dashboard',
            });
        });
    });

    test('Google OAuth button shows loading state', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        nextAuth.signIn.mockReturnValueOnce(promise);

        render(<SignupForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        resolvePromise({});
    });

    test('GitHub OAuth button shows loading state', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        nextAuth.signIn.mockReturnValueOnce(promise);

        render(<SignupForm />);

        const githubButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('GitHub')
        );

        fireEvent.click(githubButton);

        await waitFor(() => {
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        resolvePromise({});
    });

    test('OAuth buttons disabled during form submission', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        authHelpers.registerUser.mockReturnValueOnce(promise);

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            const googleButton = screen.getAllByTestId('button').find(btn =>
                btn.textContent.includes('Google')
            );
            const githubButton = screen.getAllByTestId('button').find(btn =>
                btn.textContent.includes('GitHub')
            );

            expect(googleButton).toBeDisabled();
            expect(githubButton).toBeDisabled();
        });

        resolvePromise({ success: true });
    });

    test('OAuth buttons disabled during OAuth loading', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        nextAuth.signIn.mockReturnValueOnce(promise);

        render(<SignupForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        await waitFor(() => {
            const createButton = screen.getByRole('button', { name: /Create Account/i });
            expect(createButton).toBeDisabled();
        });

        resolvePromise({});
    });

    test('OAuth button displays error message on failure', async () => {
        nextAuth.signIn.mockImplementation(() => new Promise((_, reject) => {
            setTimeout(() => reject(new Error('OAuth error')), 0);
        }));

        render(<SignupForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(screen.getAllByText('Loading...')).toHaveLength(1);
            expect(googleButton).toBeDisabled();
        });

        expect(await screen.findByText(/Failed to sign in with google/i)).toBeInTheDocument();
        expect(googleButton).not.toBeDisabled();

        expect(nextAuth.signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' });
    });

    test('OAuth error clears on new attempt', async () => {
        nextAuth.signIn.mockRejectedValueOnce(new Error('First OAuth error'));

        render(<SignupForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(screen.getByText('Failed to sign in with google')).toBeInTheDocument();
        });

        // Clear mock and try again
        nextAuth.signIn.mockClear();
        nextAuth.signIn.mockResolvedValueOnce({});

        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(screen.queryByText('Failed to sign in with google')).not.toBeInTheDocument();
        });
    });

    // ===== Integration Tests =====
    test('complete signup flow with valid credentials', async () => {
        authHelpers.registerUser.mockResolvedValueOnce({ success: true });

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
        fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'SecurePass123' } });
        fireEvent.change(confirmInput, { target: { value: 'SecurePass123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(authHelpers.registerUser).toHaveBeenCalledWith({
                name: 'Jane Smith',
                email: 'jane@example.com',
                password: 'SecurePass123',
                confirmPassword: 'SecurePass123',
            });
            expect(screen.getByText(/Verification email sent/i)).toBeInTheDocument();
        });
    });

    test('OAuth buttons show correct icons', () => {
        render(<SignupForm />);

        expect(screen.getByTestId('icon-google')).toBeInTheDocument();
        expect(screen.getByTestId('icon-github')).toBeInTheDocument();
    });

    test('create account button disabled state during OAuth loading', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        nextAuth.signIn.mockReturnValueOnce(promise);

        render(<SignupForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        await waitFor(() => {
            const createButton = screen.getByRole('button', { name: /Create Account/i });
            expect(createButton).toBeDisabled();
        });

        resolvePromise({});
    });

    test('error clears when form is submitted again after error', async () => {
        authHelpers.registerUser.mockRejectedValueOnce(new Error('First error'));
        authHelpers.registerUser.mockResolvedValueOnce({ success: true });

        render(<SignupForm />);

        const nameInput = screen.getByPlaceholderText('Enter your name');
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Create a password');
        const confirmInput = screen.getByPlaceholderText('Confirm your password');
        const submitButton = screen.getByRole('button', { name: /Create Account/i });

        // First submission with error
        fireEvent.change(nameInput, { target: { value: 'John Doe' } });
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.change(confirmInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('First error')).toBeInTheDocument();
        });

        // Second submission should clear error
        authHelpers.registerUser.mockClear();
        authHelpers.registerUser.mockResolvedValueOnce({ success: true });

        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.queryByText('First error')).not.toBeInTheDocument();
            expect(screen.getByText(/Verification email sent/i)).toBeInTheDocument();
        });
    });
});
