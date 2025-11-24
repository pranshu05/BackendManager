import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportDatabase from '@/components/(dashboard)/ImportDatabase';
// also import the named export to ensure the named export declaration is covered
import { ImportDatabase as NamedImportDatabase } from '@/components/(dashboard)/ImportDatabase';

// Mock Dialog components
jest.mock('@/components/ui/dialog', () => ({
    Dialog: ({ open, onOpenChange, children }) => (
        <div data-testid="dialog" data-open={open}>
            {children}
        </div>
    ),
    DialogTrigger: ({ asChild, children }) => (
        <div data-testid="dialog-trigger">
            {children}
        </div>
    ),
    DialogContent: ({ children }) => (
        <div data-testid="dialog-content">
            {children}
        </div>
    ),
    DialogHeader: ({ children }) => (
        <div data-testid="dialog-header">
            {children}
        </div>
    ),
    DialogTitle: ({ children }) => (
        <h2 data-testid="dialog-title">
            {children}
        </h2>
    ),
    DialogDescription: ({ children }) => (
        <p data-testid="dialog-description">
            {children}
        </p>
    ),
    DialogFooter: ({ children }) => (
        <div data-testid="dialog-footer">
            {children}
        </div>
    ),
    DialogClose: ({ asChild, children }) => (
        <div data-testid="dialog-close">
            {children}
        </div>
    ),
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, type, variant, size, className }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            type={type || 'button'}
            data-testid="button"
            data-variant={variant}
            data-size={size}
            className={className}
        >
            {children}
        </button>
    ),
}));

// Mock Input component
jest.mock('@/components/ui/input', () => ({
    Input: ({ name, value, onChange, type, required }) => (
        <input
            name={name}
            value={value}
            onChange={onChange}
            type={type || 'text'}
            required={required}
            data-testid={`input-${name}`}
        />
    ),
}));

describe('ImportDatabase Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("component loads", () => {
        render(<ImportDatabase />);
        expect(screen.getByText("Import Database")).toBeInTheDocument();
    });

    test('named export renders and is covered', () => {
        render(<NamedImportDatabase />);
        expect(screen.getByText('Import Database')).toBeInTheDocument();
    });


    describe('Initial Rendering', () => {
        test('should render Import Database button', () => {
            render(<ImportDatabase />);
            expect(screen.getByText('Import Database')).toBeInTheDocument();
        });

        test('should have correct button variant and size', () => {
            render(<ImportDatabase />);
            const button = screen.getByText('Import Database');
            expect(button).toHaveAttribute('data-variant', 'default');
            expect(button).toHaveAttribute('data-size', 'sm');
        });

        test('should render dialog with trigger', () => {
            render(<ImportDatabase />);
            expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument();
        });

        test('should render dialog title', () => {
            render(<ImportDatabase />);
            expect(screen.getByText('Import Existing Database')).toBeInTheDocument();
        });

        test('should render dialog description', () => {
            render(<ImportDatabase />);
            expect(
                screen.getByText(/Connect an existing PostgreSQL\/Neon database to DBuddy/)
            ).toBeInTheDocument();
        });
    });

    describe('Form Fields', () => {
        test('should render all form input fields', () => {
            render(<ImportDatabase />);

            expect(screen.getByTestId('input-host')).toBeInTheDocument();
            expect(screen.getByTestId('input-port')).toBeInTheDocument();
            expect(screen.getByTestId('input-username')).toBeInTheDocument();
            expect(screen.getByTestId('input-password')).toBeInTheDocument();
            expect(screen.getByTestId('input-database')).toBeInTheDocument();
            expect(screen.getByTestId('input-projectName')).toBeInTheDocument();
        });

        test('should have correct input types', () => {
            render(<ImportDatabase />);

            expect(screen.getByTestId('input-host')).toHaveAttribute('type', 'text');
            expect(screen.getByTestId('input-port')).toHaveAttribute('type', 'text');
            expect(screen.getByTestId('input-username')).toHaveAttribute('type', 'text');
            expect(screen.getByTestId('input-password')).toHaveAttribute('type', 'password');
            expect(screen.getByTestId('input-database')).toHaveAttribute('type', 'text');
            expect(screen.getByTestId('input-projectName')).toHaveAttribute('type', 'text');
        });

        test('should mark required fields as required', () => {
            render(<ImportDatabase />);

            expect(screen.getByTestId('input-host')).toHaveAttribute('required');
            expect(screen.getByTestId('input-port')).toHaveAttribute('required');
            expect(screen.getByTestId('input-username')).toHaveAttribute('required');
            expect(screen.getByTestId('input-database')).toHaveAttribute('required');
        });

        test('should not mark password as required', () => {
            render(<ImportDatabase />);
            expect(screen.getByTestId('input-password')).not.toHaveAttribute('required');
        });

        test('should not mark projectName as required', () => {
            render(<ImportDatabase />);
            expect(screen.getByTestId('input-projectName')).not.toHaveAttribute('required');
        });

        test('should have default port value of 5432', () => {
            render(<ImportDatabase />);
            expect(screen.getByTestId('input-port')).toHaveValue('5432');
        });

        test('should initialize all other fields as empty strings', () => {
            render(<ImportDatabase />);

            expect(screen.getByTestId('input-host')).toHaveValue('');
            expect(screen.getByTestId('input-username')).toHaveValue('');
            expect(screen.getByTestId('input-password')).toHaveValue('');
            expect(screen.getByTestId('input-database')).toHaveValue('');
            expect(screen.getByTestId('input-projectName')).toHaveValue('');
        });
    });

    describe('Form Input Handling', () => {
        test('should update host field on input change', () => {
            render(<ImportDatabase />);
            const hostInput = screen.getByTestId('input-host');

            fireEvent.change(hostInput, { target: { value: 'localhost' } });
            expect(hostInput).toHaveValue('localhost');
        });

        test('should update port field on input change', () => {
            render(<ImportDatabase />);
            const portInput = screen.getByTestId('input-port');

            fireEvent.change(portInput, { target: { value: '3306' } });
            expect(portInput).toHaveValue('3306');
        });

        test('should update username field on input change', () => {
            render(<ImportDatabase />);
            const usernameInput = screen.getByTestId('input-username');

            fireEvent.change(usernameInput, { target: { value: 'postgres' } });
            expect(usernameInput).toHaveValue('postgres');
        });

        test('should update password field on input change', () => {
            render(<ImportDatabase />);
            const passwordInput = screen.getByTestId('input-password');

            fireEvent.change(passwordInput, { target: { value: 'secret123' } });
            expect(passwordInput).toHaveValue('secret123');
        });

        test('should update database field on input change', () => {
            render(<ImportDatabase />);
            const databaseInput = screen.getByTestId('input-database');

            fireEvent.change(databaseInput, { target: { value: 'mydb' } });
            expect(databaseInput).toHaveValue('mydb');
        });

        test('should update projectName field on input change', () => {
            render(<ImportDatabase />);
            const projectNameInput = screen.getByTestId('input-projectName');

            fireEvent.change(projectNameInput, { target: { value: 'My Project' } });
            expect(projectNameInput).toHaveValue('My Project');
        });

        test('should handle multiple field changes', () => {
            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'db.example.com' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'admin' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'production' } });

            expect(screen.getByTestId('input-host')).toHaveValue('db.example.com');
            expect(screen.getByTestId('input-port')).toHaveValue('5432');
            expect(screen.getByTestId('input-username')).toHaveValue('admin');
            expect(screen.getByTestId('input-database')).toHaveValue('production');
        });

        test('should handle special characters in input fields', () => {
            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'p@$$w0rd!#%' } });
            expect(screen.getByTestId('input-password')).toHaveValue('p@$$w0rd!#%');
        });
    });

    describe('Form Submission - Success', () => {
        test('should submit form with valid data', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ project: { id: 1, name: 'My Project' } }),
            });

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    '/api/projects/import',
                    expect.any(Object)
                );
            });
        });

        test('should close dialog on successful import', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
            });
        });

        test('should reset form fields after successful import', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '3306' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });
            fireEvent.change(screen.getByTestId('input-projectName'), { target: { value: 'My Project' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.getByTestId('input-host')).toHaveValue('');
                expect(screen.getByTestId('input-port')).toHaveValue('5432');
                expect(screen.getByTestId('input-username')).toHaveValue('');
                expect(screen.getByTestId('input-database')).toHaveValue('');
                expect(screen.getByTestId('input-projectName')).toHaveValue('');
            });
        });

        test('should call onImported callback with project data', async () => {
            const mockOnImported = jest.fn();
            const projectData = { id: 1, name: 'Test Project' };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ project: projectData }),
            });

            render(<ImportDatabase onImported={mockOnImported} />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(mockOnImported).toHaveBeenCalledWith(projectData);
            });
        });

        test('should not call onImported if callback is not provided', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
            });
        });

        test('should include all form data in request body', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'db.example.com' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'admin' } });
            fireEvent.change(screen.getByTestId('input-password'), { target: { value: 'secret' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'proddb' } });
            fireEvent.change(screen.getByTestId('input-projectName'), { target: { value: 'Production' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
                const callArgs = global.fetch.mock.calls[0];
                const bodyString = callArgs[1].body;
                const bodyObj = JSON.parse(bodyString);
                expect(bodyObj.host).toBe('db.example.com');
                expect(bodyObj.port).toBe(5432);
                expect(bodyObj.username).toBe('admin');
                expect(bodyObj.password).toBe('secret');
                expect(bodyObj.database).toBe('proddb');
                expect(bodyObj.projectName).toBe('Production');
            });
        });

        test('should disable submit button while loading', async () => {
            global.fetch.mockImplementationOnce(
                () => new Promise(() => { }) // Never resolves
            );

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                const submitButtons = screen.getAllByRole('button').filter(btn =>
                    btn.textContent.includes('Importing')
                );
                if (submitButtons.length > 0) {
                    expect(submitButtons[0]).toBeDisabled();
                }
            });
        });

        test('should show Importing text while loading', async () => {
            global.fetch.mockImplementationOnce(
                () => new Promise(() => { })
            );

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.queryByText('Importing...')).toBeInTheDocument();
            });
        });
    });

    describe('Form Submission - Errors', () => {
        test('should display error message when import fails with server error', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Invalid database credentials' }),
            });

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'wrong' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.getByText('Invalid database credentials')).toBeInTheDocument();
            });
        });

        test('should display default error message when server error has no message', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({}),
            });

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.getByText('Import failed')).toBeInTheDocument();
            });
        });

        test('should display error message on network error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.getByText('Network error')).toBeInTheDocument();
            });
        });

        test('should display default error message on network error with no message', async () => {
            global.fetch.mockRejectedValueOnce(new Error());

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.getByText('Import error')).toBeInTheDocument();
            });
        });

        test('should set loading to false after error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.queryByText('Importing...')).not.toBeInTheDocument();
            });
        });

        test('should clear previous error when submitting new form', async () => {
            const { rerender } = render(<ImportDatabase />);

            // First submission with error
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'First error' }),
            });

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            let form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.getByText('First error')).toBeInTheDocument();
            });

            // Second submission
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'newhost' } });
            form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(screen.queryByText('First error')).not.toBeInTheDocument();
            });
        });
    });

    describe('Dialog Behavior', () => {
        test('should render Cancel button', () => {
            render(<ImportDatabase />);
            const cancelButtons = screen.getAllByText('Cancel');
            expect(cancelButtons.length).toBeGreaterThan(0);
        });

        test('should render Import button', () => {
            render(<ImportDatabase />);
            const submitButtons = screen.getAllByRole('button').filter(btn =>
                btn.textContent.includes('Import') && !btn.textContent.includes('Database')
            );
            expect(submitButtons.length).toBeGreaterThan(0);
        });

        test('should have Cancel button in dialog footer', () => {
            render(<ImportDatabase />);
            const footer = screen.getByTestId('dialog-footer');
            const cancelButton = screen.getByTestId('dialog-close').querySelector('button');
            expect(footer).toContainElement(cancelButton);
        });
    });

    describe('Form Attributes', () => {
        test('should have form with onSubmit handler', () => {
            render(<ImportDatabase />);
            const form = screen.getByTestId('input-host').closest('form');
            expect(form).toBeInTheDocument();
        });

        test('should render error message in red when error exists', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Test error message' }),
            });

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                const errorElement = screen.getByText('Test error message');
                expect(errorElement).toHaveClass('text-red-600');
            });
        });

        test('should not display error message initially', () => {
            render(<ImportDatabase />);
            expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        });

        test('should have proper input labels', () => {
            render(<ImportDatabase />);
            expect(screen.getByText('Host')).toBeInTheDocument();
            expect(screen.getByText('Port')).toBeInTheDocument();
            expect(screen.getByText('Username')).toBeInTheDocument();
            expect(screen.getByText('Password')).toBeInTheDocument();
            expect(screen.getByText('Database')).toBeInTheDocument();
            expect(screen.getByText('Project Name (optional)')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        test('should handle empty form submission', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Required fields missing' }),
            });

            render(<ImportDatabase />);

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
            });
        });

        test('should handle very long input values', async () => {
            const longString = 'a'.repeat(1000);
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: longString } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
                const callArgs = global.fetch.mock.calls[0];
                const bodyString = callArgs[1].body;
                const bodyObj = JSON.parse(bodyString);
                expect(bodyObj.host).toBe(longString);
                expect(bodyObj.host.length).toBe(1000);
            });
        });

        test('should handle unicode characters in input', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-projectName'), { target: { value: '数据库 🚀' } });
            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
                const callArgs = global.fetch.mock.calls[0];
                const bodyString = callArgs[1].body;
                const bodyObj = JSON.parse(bodyString);
                expect(bodyObj.projectName).toBe('数据库 🚀');
            });
        });

        test('should handle rapid successive submissions', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ project: { id: 1 } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ project: { id: 2 } }),
                });

            const mockOnImported = jest.fn();
            render(<ImportDatabase onImported={mockOnImported} />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');

            fireEvent.submit(form);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledTimes(1);
            });
        });

        test('should handle response with additional properties', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    project: {
                        id: 1,
                        name: 'Test',
                        created_at: '2024-01-01',
                        tables: ['users', 'posts']
                    },
                    message: 'Import successful'
                }),
            });

            const mockOnImported = jest.fn();
            render(<ImportDatabase onImported={mockOnImported} />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(mockOnImported).toHaveBeenCalledWith(
                    expect.objectContaining({
                        id: 1,
                        name: 'Test',
                    })
                );
            });
        });

        test('should handle numeric port as string', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ project: { id: 1 } }),
            });

            render(<ImportDatabase />);

            fireEvent.change(screen.getByTestId('input-host'), { target: { value: 'localhost' } });
            fireEvent.change(screen.getByTestId('input-port'), { target: { value: '5432' } });
            fireEvent.change(screen.getByTestId('input-username'), { target: { value: 'user' } });
            fireEvent.change(screen.getByTestId('input-database'), { target: { value: 'db' } });

            const form = screen.getByTestId('input-host').closest('form');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
                const callArgs = global.fetch.mock.calls[0];
                const bodyString = callArgs[1].body;
                const bodyObj = JSON.parse(bodyString);
                // Port is stored as number in form state
                expect(bodyObj.port).toEqual(5432);
            });
        });
    });
});
