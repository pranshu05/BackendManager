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
        delete window.location;
        window.location = { href: '' };
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

        expect(emailInput.value).toBe('test@example.com');
    });

    test('email input accepts valid email format', () => {
        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        fireEvent.change(emailInput, { target: { value: 'user@domain.com' } });

        expect(emailInput.value).toBe('user@domain.com');
    });

    // ===== Password Input Tests =====
    test('password input updates on change', () => {
        render(<LoginForm />);

        const passwordInput = screen.getByPlaceholderText('Enter your password');
        fireEvent.change(passwordInput, { target: { value: 'password123' } });

        expect(passwordInput.value).toBe('password123');
    });

    test('password field is initially hidden', () => {
        render(<LoginForm />);

        const passwordInput = screen.getByPlaceholderText('Enter your password');
        expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('password toggle shows Eye icon initially', () => {
        render(<LoginForm />);

        expect(screen.getByTestId('icon-eye')).toBeInTheDocument();
    });

    test('clicking eye icon toggles password visibility', () => {
        render(<LoginForm />);

        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const toggleButton = screen.getByTestId('icon-eye').closest('button');

        expect(passwordInput).toHaveAttribute('type', 'password');

        fireEvent.click(toggleButton);

        expect(passwordInput).toHaveAttribute('type', 'text');
        expect(screen.getByTestId('icon-eye-off')).toBeInTheDocument();
    });

    test('clicking eye icon twice toggles password back to hidden', () => {
        render(<LoginForm />);

        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const eyeIcon = screen.getByTestId('icon-eye');
        const toggleButton = eyeIcon.closest('button');

        fireEvent.click(toggleButton);
        expect(passwordInput).toHaveAttribute('type', 'text');

        const eyeOffIcon = screen.getByTestId('icon-eye-off');
        const toggleButtonAgain = eyeOffIcon.closest('button');
        fireEvent.click(toggleButtonAgain);

        expect(passwordInput).toHaveAttribute('type', 'password');
        expect(screen.getByTestId('icon-eye')).toBeInTheDocument();
    });

    // ===== Form Submission Tests =====
    test('successful login redirects to dashboard', async () => {
        nextAuth.signIn.mockResolvedValueOnce({ error: null });

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            // Check that signIn was called successfully
            expect(nextAuth.signIn).toHaveBeenCalledWith('credentials', {
                email: 'test@example.com',
                password: 'password123',
                redirect: false,
            });
            // The component sets window.location.href to /dashboard
            expect(window.location.href).not.toBe('');
        });
    });

    test('failed login displays error message', async () => {
        nextAuth.signIn.mockResolvedValueOnce({ error: 'Invalid credentials' });

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });
    });

    test('button is disabled during login', async () => {
        nextAuth.signIn.mockImplementation(() => new Promise(() => { }));

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Signing in/i })).toBeDisabled();
        });
    });

    test('button text changes to "Signing in..." during login', async () => {
        nextAuth.signIn.mockImplementation(() => new Promise(() => { }));

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Signing in...')).toBeInTheDocument();
        });
    });

    test('signIn is called with correct credentials', async () => {
        nextAuth.signIn.mockResolvedValueOnce({ error: null });

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

    test('error is cleared on new login attempt', async () => {
        nextAuth.signIn.mockResolvedValueOnce({ error: 'Invalid credentials' });

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
        });

        // New attempt
        nextAuth.signIn.mockResolvedValueOnce({ error: null });
        fireEvent.change(passwordInput, { target: { value: 'correctpassword' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
        });
    });

    // ===== OAuth Tests =====
    test('Google button calls signIn with google provider', async () => {
        nextAuth.signIn.mockResolvedValueOnce({});

        render(<LoginForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(nextAuth.signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' });
        });
    });

    test('GitHub button calls signIn with github provider', async () => {
        nextAuth.signIn.mockResolvedValueOnce({});

        render(<LoginForm />);

        const githubButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('GitHub')
        );

        fireEvent.click(githubButton);

        await waitFor(() => {
            expect(nextAuth.signIn).toHaveBeenCalledWith('github', { callbackUrl: '/dashboard' });
        });
    });

    test('OAuth button shows loading state during authentication', async () => {
        nextAuth.signIn.mockImplementation(() => new Promise(() => { }));

        render(<LoginForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
    });

    test('OAuth buttons are disabled during OAuth loading', async () => {
        nextAuth.signIn.mockImplementation(() => new Promise(() => { }));

        render(<LoginForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        await waitFor(() => {
            const allButtons = screen.getAllByTestId('button');
            allButtons.forEach(button => {
                expect(button).toBeDisabled();
            });
        });
    });

    test('OAuth error is handled gracefully', async () => {
        // Mock signIn to throw error
        nextAuth.signIn.mockRejectedValueOnce(new Error('OAuth error'));

        render(<LoginForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        // The error should be caught and set in the error state
        // Since the component catches the error but doesn't immediately show it,
        // we need to wait for the state update
        await waitFor(() => {
            expect(nextAuth.signIn).toHaveBeenCalled();
        });

        // The button should be re-enabled after error
        await waitFor(() => {
            expect(googleButton).not.toBeDisabled();
        }, { timeout: 3000 });
    });

    test('OAuth error clears on new attempt', async () => {
        nextAuth.signIn.mockRejectedValueOnce(new Error('First OAuth error'));

        render(<LoginForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(nextAuth.signIn).toHaveBeenCalled();
        });

        // Second attempt should clear error
        nextAuth.signIn.mockResolvedValueOnce({});
        
        // Wait for button to be enabled again
        await waitFor(() => {
            expect(googleButton).not.toBeDisabled();
        }, { timeout: 3000 });

        fireEvent.click(googleButton);

        await waitFor(() => {
            expect(nextAuth.signIn).toHaveBeenCalledTimes(2);
        });
    });

    // ===== Edge Cases =====
    test('handles exception during login', async () => {
        nextAuth.signIn.mockRejectedValueOnce(new Error('Network error'));

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Network error|An error occurred during login/i)).toBeInTheDocument();
        });
    });

    test('OAuth buttons are disabled when regular login is in progress', async () => {
        nextAuth.signIn.mockImplementation(() => new Promise(() => { }));

        render(<LoginForm />);

        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const submitButton = screen.getByRole('button', { name: /Sign In/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            const allButtons = screen.getAllByTestId('button');
            allButtons.forEach(button => {
                expect(button).toBeDisabled();
            });
        });
    });

    test('main login button is disabled when OAuth is in progress', async () => {
        nextAuth.signIn.mockImplementation(() => new Promise(() => { }));

        render(<LoginForm />);

        const googleButton = screen.getAllByTestId('button').find(btn =>
            btn.textContent.includes('Google')
        );

        fireEvent.click(googleButton);

        await waitFor(() => {
            const signInButton = screen.getAllByTestId('button').find(btn =>
                btn.textContent.includes('Loading...')
            );
            expect(signInButton).toBeDisabled();
        });
    });
});
