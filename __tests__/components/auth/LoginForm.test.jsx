import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '@/components/(auth)/LoginForm';
import * as nextAuth from 'next-auth/react';

// Mock next-auth
jest.mock('next-auth/react');

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

describe('LoginForm Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ===== Initial Render Tests =====
    test('renders login form with all required fields', () => {
        render(<LoginForm />);

        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Password')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Forgot Password/i })).toBeInTheDocument();
    });

    test('renders sign in button with correct text', () => {
        render(<LoginForm />);

        const signInButton = screen.getByRole('button', { name: /Sign In/i });
        expect(signInButton).toBeInTheDocument();
        expect(signInButton).not.toBeDisabled();
    });

    test('renders OAuth buttons (Google and GitHub)', () => {
        render(<LoginForm />);

        const buttons = screen.getAllByTestId('button');
        expect(screen.getByTestId('icon-google')).toBeInTheDocument();
        expect(screen.getByTestId('icon-github')).toBeInTheDocument();
        expect(screen.getByText('Or continue with')).toBeInTheDocument();
    });

    test('forgot password link has correct href', () => {
        render(<LoginForm />);

        const forgotLink = screen.getByRole('link', { name: /Forgot Password/i });
        expect(forgotLink).toHaveAttribute('href', '/reset');
    });

    // ===== Email Input Tests =====
    test('email input updates on change', () => {
        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

        expect(emailInput).toHaveValue('test@example.com');
    });

    // ===== Password Input Tests =====
    test('password input updates on change', () => {
        render(<LoginForm />);

        const passwordInput = screen.getByPlaceholderText('Enter your password');
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(passwordInput).toHaveValue('password123');
    });

    test('password input type is password by default', () => {
        render(<LoginForm />);

        const passwordInput = screen.getByPlaceholderText('Enter your password');
        expect(passwordInput).toHaveAttribute('type', 'password');
    });

    // ===== Password Visibility Toggle Tests =====
    test('password visibility toggle switches input type', () => {
        render(<LoginForm />);

        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const toggleButton = screen.getAllByRole('button').find(btn =>
            btn.querySelector('[data-testid="icon-eye"], [data-testid="icon-eye-off"]')
        );

        // Initial state: password type
        expect(passwordInput).toHaveAttribute('type', 'password');

        // Click toggle to show password
        fireEvent.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');

        // Click toggle again to hide password
        fireEvent.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'password');
    });

    // ===== Form Submission Tests =====
    test('form submit calls signIn with correct credentials', async () => {
        nextAuth.signIn.mockResolvedValueOnce({ ok: true, error: null });

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(nextAuth.signIn).toHaveBeenCalledWith('credentials', {
                email: 'test@example.com',
                password: 'password123',
                redirect: false,
            });
        });
    });

    test('form submit shows loading state', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        nextAuth.signIn.mockReturnValueOnce(promise);

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Signing in/i })).toBeInTheDocument();
        });

        resolvePromise({ ok: true, error: null });
    });

    test('form submit displays error message on failure', async () => {
        nextAuth.signIn.mockResolvedValueOnce({
            ok: false,
            error: 'Invalid email or password',
        });

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
        });
    });

    test('form submit catches exception and displays error', async () => {
        nextAuth.signIn.mockRejectedValueOnce(new Error('Network error'));

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
        });
    });

    test('form submit catches exception with generic message', async () => {
        nextAuth.signIn.mockRejectedValueOnce(new Error());

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('An error occurred during login')).toBeInTheDocument();
        });
    });

    test('sign in succeeds with signIn returning no error', async () => {
        nextAuth.signIn.mockResolvedValueOnce({ ok: true, error: null });

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(nextAuth.signIn).toHaveBeenCalledWith('credentials', {
                email: 'test@example.com',
                password: 'password123',
                redirect: false,
            });
        });
    });

    test('sign in button disabled state during loading', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        nextAuth.signIn.mockReturnValueOnce(promise);

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        expect(submitButton).not.toBeDisabled();

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Signing in/i })).toBeDisabled();
        });

        resolvePromise({ ok: true, error: null });
    });

    test('error clears when form is submitted again', async () => {
        nextAuth.signIn.mockRejectedValueOnce(new Error('First error'));
        nextAuth.signIn.mockResolvedValueOnce({ ok: false, error: null });

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        // First submission with error
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('First error')).toBeInTheDocument();
        });

        // Clear mocks for second submission
        nextAuth.signIn.mockClear();
        nextAuth.signIn.mockResolvedValueOnce({ ok: true, error: null });

        // Second submission should clear error
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.queryByText('First error')).not.toBeInTheDocument();
        });
    });

    // ===== OAuth Button Tests =====
    test('Google OAuth button triggers signIn', async () => {
        nextAuth.signIn.mockResolvedValueOnce({});

        render(<LoginForm />);

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

        render(<LoginForm />);

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

        render(<LoginForm />);

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

        render(<LoginForm />);

        const githubButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('GitHub')
        );

        fireEvent.click(githubButton);

        await waitFor(() => {
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        resolvePromise({});
    });

    test('OAuth buttons disabled during sign in', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        nextAuth.signIn.mockReturnValueOnce(promise);

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
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

        resolvePromise({ ok: true, error: null });
    });

    test('OAuth buttons disabled during OAuth loading', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        nextAuth.signIn.mockReturnValueOnce(promise);

        render(<LoginForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        await waitFor(() => {
            const signInButton = screen.getByRole('button', { name: /Sign In/i });
            expect(signInButton).toBeDisabled();
        });

        resolvePromise({});
    });

    test('OAuth button displays error message on failure', async () => {
        // Use delayed rejection to allow loading state to render briefly
        nextAuth.signIn.mockImplementation(() => new Promise((_, reject) => {
            setTimeout(() => reject(new Error('OAuth error')), 0);
        }));

        render(<LoginForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        // Click should initiate loading and disable button
        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(screen.getAllByText('Loading...')).toHaveLength(1);
            expect(googleButton).toBeDisabled();
        });

        // After rejection, error should appear and button re-enabled
        await waitFor(() => {
            expect(screen.getByText('Failed to sign in with google')).toBeInTheDocument();
            expect(googleButton).not.toBeDisabled();
        });

        expect(nextAuth.signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' });
    });

    test('OAuth error clears on new attempt', async () => {
        nextAuth.signIn.mockRejectedValueOnce(new Error('First OAuth error'));

        render(<LoginForm />);

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
    test('complete login flow with email and password', async () => {
        nextAuth.signIn.mockResolvedValueOnce({ ok: true, error: null });

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        // Fill form
        fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'SecurePassword123' } });

        // Submit
        fireEvent.click(submitButton);

        // Verify signIn called with correct credentials
        await waitFor(() => {
            expect(nextAuth.signIn).toHaveBeenCalledWith('credentials', {
                email: 'user@example.com',
                password: 'SecurePassword123',
                redirect: false,
            });
        });
    });

    test('OAuth buttons show correct icons', () => {
        render(<LoginForm />);

        expect(screen.getByTestId('icon-google')).toBeInTheDocument();
        expect(screen.getByTestId('icon-github')).toBeInTheDocument();
    });

    test('form maintains separate password and OAuth loading states', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        nextAuth.signIn.mockReturnValueOnce(promise);

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            const signingInButton = screen.getByRole('button', { name: /Signing in/i });
            expect(signingInButton).toBeDisabled();
        });

        resolvePromise({ ok: true, error: null });
    });
});
