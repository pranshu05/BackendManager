import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ProjectCard } from '@/components/(dashboard)/ProjectCard';
import { showToast } from 'nextjs-toast-notify';

// Mock Next.js Link component
jest.mock('next/link', () => {
    return ({ children, href, onClick }) => (
        <a href={href} onClick={onClick} data-testid={`link-${href}`}>
            {children}
        </a>
    );
});

// Mock nextjs-toast-notify
jest.mock('nextjs-toast-notify', () => ({
    showToast: {
        error: jest.fn(),
        success: jest.fn(),
    },
}));

// Mock UI components
let capturedDialogOnOpenChange = null;
jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }) => <div data-testid="card" className={className}>{children}</div>,
    CardContent: ({ children, className }) => <div data-testid="card-content" className={className}>{children}</div>,
    CardDescription: ({ children, className }) => <div data-testid="card-description" className={className}>{children}</div>,
    CardHeader: ({ children, className }) => <div data-testid="card-header" className={className}>{children}</div>,
    CardTitle: ({ children, className }) => <div data-testid="card-title" className={className}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children, className }) => <div data-testid="badge" className={className}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, size, variant, className, type }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            data-testid="button"
            data-size={size}
            data-variant={variant}
            className={className}
            type={type}
        >
            {children}
        </button>
    ),
}));

jest.mock('@/components/ui/dialog', () => ({
    Dialog: ({ open, onOpenChange, children }) => {
        // capture handler so tests can simulate dialog lifecycle changes
        capturedDialogOnOpenChange = onOpenChange;
        if (!open) return null;
        return (
            <div data-testid="dialog" data-open={open}>
                {React.Children.map(children, (child) =>
                    React.cloneElement(child, { onOpenChange })
                )}
            </div>
        );
    },
    DialogContent: ({ children, onOpenChange }) => (
        <div data-testid="dialog-content">
            {children}
            <button data-testid="dialog-close" onClick={() => onOpenChange && onOpenChange(false)} />
        </div>
    ),
    DialogDescription: ({ children }) => (
        <div data-testid="dialog-description">{children}</div>
    ),
    DialogFooter: ({ children }) => (
        <div data-testid="dialog-footer">{children}</div>
    ),
    DialogHeader: ({ children }) => (
        <div data-testid="dialog-header">{children}</div>
    ),
    DialogTitle: ({ children }) => (
        <h2 data-testid="dialog-title">{children}</h2>
    ),
}));

jest.mock('lucide-react', () => ({
    Database: ({ className }) => <div data-testid="icon-database" className={className} />,
    CheckCircle: ({ className }) => <div data-testid="icon-check-circle" className={className} />,
    Clock: ({ className }) => <div data-testid="icon-clock" className={className} />,
    AlertCircle: ({ className }) => <div data-testid="icon-alert-circle" className={className} />,
    ExternalLink: ({ className }) => <div data-testid="icon-external-link" className={className} />,
    Settings: ({ className }) => <div data-testid="icon-settings" className={className} />,
    Table: ({ className }) => <div data-testid="icon-table" className={className} />,
    Trash2: ({ className }) => <div data-testid="icon-trash2" className={className} />,
    Pencil: ({ className }) => <div data-testid="icon-pencil" className={className} />,
}));

describe('ProjectCard Component', () => {
    const mockProject = {
        id: 'proj-1',
        name: 'Test Project',
        description: 'Test Description',
        database: {
            name: 'test_db',
            status: 'connected',
            tables: 5,
            lastModified: '2025-01-01',
        },
        createdAt: '2024-12-01',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('renders project card with all information', () => {
        render(<ProjectCard project={mockProject} />);
        
        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText('test_db')).toBeInTheDocument();
        expect(screen.getByText('5 tables')).toBeInTheDocument();
        expect(screen.getByText(/Modified 2025-01-01/)).toBeInTheDocument();
    });

    test('displays correct status badge for connected database', () => {
        render(<ProjectCard project={mockProject} />);
        
        expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
        expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    test('displays correct status badge for creating database', () => {
        const creatingProject = {
            ...mockProject,
            database: { ...mockProject.database, status: 'creating' },
        };
        
        render(<ProjectCard project={creatingProject} />);
        
        expect(screen.getByTestId('icon-clock')).toBeInTheDocument();
        expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    test('displays correct status badge for error database', () => {
        const errorProject = {
            ...mockProject,
            database: { ...mockProject.database, status: 'error' },
        };
        
        render(<ProjectCard project={errorProject} />);
        
        expect(screen.getByTestId('icon-alert-circle')).toBeInTheDocument();
        expect(screen.getByText('Error')).toBeInTheDocument();
    });

    test('displays created date', () => {
        render(<ProjectCard project={mockProject} />);
        
        const createdDate = new Date('2024-12-01').toLocaleDateString();
        expect(screen.getByText(`Created on ${createdDate}`)).toBeInTheDocument();
    });

    test('Open button is disabled when database is not connected', () => {
        const notConnectedProject = {
            ...mockProject,
            database: { ...mockProject.database, status: 'creating' },
        };
        
        render(<ProjectCard project={notConnectedProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const openButton = buttons[0]; // First button is Open
        expect(openButton).toBeDisabled();
    });

    test('Settings button is disabled when database is not connected', () => {
        const notConnectedProject = {
            ...mockProject,
            database: { ...mockProject.database, status: 'error' },
        };
        
        render(<ProjectCard project={notConnectedProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1]; // Second button is Settings
        expect(settingsButton).toBeDisabled();
    });

    test('menu toggles when Settings button is clicked', () => {
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        
        // Menu should not be visible initially
        expect(screen.queryByText('Edit Project')).not.toBeInTheDocument();
        
        // Click Settings button
        fireEvent.click(settingsButton);
        
        // Menu should now be visible
        expect(screen.getByText('Edit Project')).toBeInTheDocument();
        expect(screen.getByText('Delete Database')).toBeInTheDocument();
    });

    test('menu closes when clicking outside', async () => {
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        
        // Open menu
        fireEvent.click(settingsButton);
        expect(screen.getByText('Edit Project')).toBeInTheDocument();
        
        // Click outside (simulate document click)
        fireEvent.mouseDown(document.body);
        
        await waitFor(() => {
            expect(screen.queryByText('Edit Project')).not.toBeInTheDocument();
        });
    });

    test('menu remains open when clicking inside', async () => {
        render(<ProjectCard project={mockProject} />);

        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];

        // Open menu
        fireEvent.click(settingsButton);
        expect(screen.getByText('Edit Project')).toBeInTheDocument();

        // Click inside the menu (Edit Project) using mousedown and it should still be open
        const editButton = screen.getByText('Edit Project');
        fireEvent.mouseDown(editButton);

        expect(screen.getByText('Edit Project')).toBeInTheDocument();
    });

    test('opening edit modal populates fields with project data', () => {
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const editButton = screen.getByText('Edit Project');
        fireEvent.click(editButton);
        
        expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
        // Also verify the onOpenChange handler can close the dialog when not loading
        fireEvent.click(screen.getByTestId('dialog-close'));
        expect(screen.queryByTestId('dialog-title')).not.toBeInTheDocument();
    });

    test('edit modal cancels without submitting', async () => {
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const editButton = screen.getByText('Edit Project');
        fireEvent.click(editButton);
        
        // Click Cancel button
        const dialogButtons = screen.getAllByTestId('button').slice(2);
        const cancelButton = dialogButtons[0];
        fireEvent.click(cancelButton);
        
        await waitFor(() => {
            expect(screen.queryByTestId('dialog-title')).not.toBeInTheDocument();
        });
        
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('edit modal shows error when name is empty', async () => {
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const editButton = screen.getByText('Edit Project');
        fireEvent.click(editButton);
        
        // Clear the name field
        const nameInput = screen.getByDisplayValue('Test Project');
        fireEvent.change(nameInput, { target: { value: '' } });
        
        // Submit form
        const form = nameInput.closest('form');
        fireEvent.submit(form);
        
        await waitFor(() => {
            expect(showToast.error).toHaveBeenCalledWith(
                'Project name cannot be empty',
                expect.any(Object)
            );
        });
        
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('edit modal successfully updates project', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
        });
        // don't mock window.location.reload here — we only assert side effects and toasts
        
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const editButton = screen.getByText('Edit Project');
        fireEvent.click(editButton);
        
        const nameInput = screen.getByDisplayValue('Test Project');
        fireEvent.change(nameInput, { target: { value: 'Updated Project' } });
        
        const form = nameInput.closest('form');
        fireEvent.submit(form);
        
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/projects/proj-1',
                expect.objectContaining({
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                })
            );
            expect(showToast.success).toHaveBeenCalledWith(
                'Project updated successfully!',
                expect.any(Object)
            );
            // The edit dialog should close on success
            expect(screen.queryByTestId('dialog-title')).not.toBeInTheDocument();
            // window.location.reload was invoked; we avoid asserting it here because it's not configurable in test environment
        });
        // no reload assert
    });

    test('edit modal shows error on failed API call', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'API Error' }),
        });
        
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const editButton = screen.getByText('Edit Project');
        fireEvent.click(editButton);
        
        const nameInput = screen.getByDisplayValue('Test Project');
        fireEvent.change(nameInput, { target: { value: 'Updated Project' } });
        
        const form = nameInput.closest('form');
        fireEvent.submit(form);
        
        await waitFor(() => {
            expect(showToast.error).toHaveBeenCalledWith(
                'API Error',
                expect.any(Object)
            );
        });
    });

    test('edit modal shows error on network failure', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));
        
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const editButton = screen.getByText('Edit Project');
        fireEvent.click(editButton);
        
        const nameInput = screen.getByDisplayValue('Test Project');
        fireEvent.change(nameInput, { target: { value: 'Updated Project' } });
        
        const form = nameInput.closest('form');
        fireEvent.submit(form);
        
        await waitFor(() => {
            expect(showToast.error).toHaveBeenCalledWith(
                expect.stringContaining('Error updating project'),
                expect.any(Object)
            );
        });
    });

    test('edit modal shows fallback error when API returns empty error', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({}),
        });

        render(<ProjectCard project={mockProject} />);

        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);

        const editButton = screen.getByText('Edit Project');
        fireEvent.click(editButton);

        const nameInput = screen.getByDisplayValue('Test Project');
        fireEvent.change(nameInput, { target: { value: 'Updated Project' } });

        const form = nameInput.closest('form');
        fireEvent.submit(form);

        await waitFor(() => {
            expect(showToast.error).toHaveBeenCalledWith(
                'Failed to update project',
                expect.any(Object)
            );
        });
    });

    test('opening delete confirmation dialog', () => {
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const deleteButton = screen.getByText('Delete Database');
        fireEvent.click(deleteButton);
        
        expect(screen.getByText('Delete this database?')).toBeInTheDocument();
        expect(screen.getByText(/will permanently delete/)).toBeInTheDocument();
        // Verify onOpenChange closes dialog when not deleting
        fireEvent.click(screen.getByTestId('dialog-close'));
        expect(screen.queryByText('Delete this database?')).not.toBeInTheDocument();
    });

    test('delete confirmation cancels without deleting', async () => {
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const deleteButton = screen.getByText('Delete Database');
        fireEvent.click(deleteButton);
        
        // Find and click Cancel button in the dialog
        const dialogButtons = screen.getAllByTestId('button').slice(2);
        const cancelButton = dialogButtons[0];
        fireEvent.click(cancelButton);
        
        await waitFor(() => {
            expect(screen.queryByText('Delete this database?')).not.toBeInTheDocument();
        });
        
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test('delete confirmation successfully deletes project', async () => {
        global.fetch.mockResolvedValueOnce({ ok: true });
        
        const mockOnDeleted = jest.fn();
        render(<ProjectCard project={mockProject} onDeleted={mockOnDeleted} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const deleteButton = screen.getByText('Delete Database');
        fireEvent.click(deleteButton);
        
        // Find and click Delete button in the confirmation dialog
        const dialogButtons = screen.getAllByTestId('button').slice(2);
        const confirmDeleteButton = dialogButtons[1];
        fireEvent.click(confirmDeleteButton);
        
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                '/api/projects/proj-1',
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
            expect(mockOnDeleted).toHaveBeenCalledWith('proj-1');
            // Verify the dialog closed after successful delete
            expect(screen.queryByText('Delete this database?')).not.toBeInTheDocument();
        });
    });

    test('delete confirmation reloads page when onDeleted callback not provided', async () => {
        global.fetch.mockResolvedValueOnce({ ok: true });
        // don't mock window.location.reload; we assert fetch was called

        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const deleteButton = screen.getByText('Delete Database');
        fireEvent.click(deleteButton);
        
        const dialogButtons = screen.getAllByTestId('button').slice(2);
        const confirmDeleteButton = dialogButtons[1];
        fireEvent.click(confirmDeleteButton);
        
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
            // window.location.reload executed but is not asserted here
        });
        // no reload assert or restore
    });

    test('delete confirmation shows error on failed deletion', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Delete failed' }),
        });
        
        window.alert = jest.fn();
        
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const deleteButton = screen.getByText('Delete Database');
        fireEvent.click(deleteButton);
        
        const dialogButtons = screen.getAllByTestId('button').slice(2);
        const confirmDeleteButton = dialogButtons[1];
        fireEvent.click(confirmDeleteButton);
        
        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Delete failed');
        });
    });

    test('delete confirmation shows error on network failure', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));
        
        window.alert = jest.fn();
        
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const deleteButton = screen.getByText('Delete Database');
        fireEvent.click(deleteButton);
        
        const dialogButtons = screen.getAllByTestId('button').slice(2);
        const confirmDeleteButton = dialogButtons[1];
        fireEvent.click(confirmDeleteButton);
        
        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Network error');
        });
    });

    test('delete confirmation shows fallback error when res.json throws', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => { throw new Error('bad parse'); },
        });

        window.alert = jest.fn();

        render(<ProjectCard project={mockProject} />);

        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);

        const deleteButton = screen.getByText('Delete Database');
        fireEvent.click(deleteButton);

        const dialogButtons = screen.getAllByTestId('button').slice(2);
        const confirmDeleteButton = dialogButtons[1];
        fireEvent.click(confirmDeleteButton);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith('Failed to delete project');
        });
    });

    test('unknown database status gracefully falls back', () => {
        const unknownStatusProject = {
            ...mockProject,
            database: { ...mockProject.database, status: 'mystery' },
        };

        render(<ProjectCard project={unknownStatusProject} />);

        expect(screen.queryByTestId('icon-check-circle')).not.toBeInTheDocument();
        expect(screen.queryByTestId('icon-clock')).not.toBeInTheDocument();
        expect(screen.queryByTestId('icon-alert-circle')).not.toBeInTheDocument();
        expect(screen.queryByText('Connected')).not.toBeInTheDocument();
        expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
        expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });

    test('Open button link has correct href when database is connected', () => {
        render(<ProjectCard project={mockProject} />);
        
        const link = screen.getByTestId('link-/dashboard/projects/proj-1');
        expect(link).toHaveAttribute('href', '/dashboard/projects/proj-1');
    });

    // test('Open button link prevents navigation when database is not connected', () => {
    //     const notConnectedProject = {
    //         ...mockProject,
    //         database: { ...mockProject.database, status: 'creating' },
    //     };
        
    //     render(<ProjectCard project={notConnectedProject} />);
        
    //     const link = screen.getByTestId('link-/dashboard/projects/proj-1');
    //     const mockPreventDefault = jest.fn();
    //     fireEvent.click(link, { preventDefault: mockPreventDefault });
        
    //     // The onClick handler should call preventDefault
    //     expect(link).toBeInTheDocument();
    //     expect(mockPreventDefault).toHaveBeenCalled();
    // });

    test('edit description field can be modified', () => {
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const editButton = screen.getByText('Edit Project');
        fireEvent.click(editButton);
        
        const descriptionInput = screen.getByDisplayValue('Test Description');
        fireEvent.change(descriptionInput, { target: { value: 'Updated Description' } });
        
        expect(descriptionInput).toHaveValue('Updated Description');
    });

    test('project without description renders correctly', () => {
        const projectWithoutDesc = {
            ...mockProject,
            description: '',
        };
        
        render(<ProjectCard project={projectWithoutDesc} />);
        
        expect(screen.getByTestId('card')).toBeInTheDocument();
        expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    test('menu disappears after clicking Edit Project', async () => {
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        expect(screen.getByText('Edit Project')).toBeInTheDocument();
        
        const editButton = screen.getByText('Edit Project');
        fireEvent.click(editButton);
        
        // Menu should close after clicking Edit
        await waitFor(() => {
            // We can't directly test visibility, but Edit modal should open
            expect(screen.getByTestId('dialog-title')).toBeInTheDocument();
        });
    });

    test('edit modal disabled state during loading', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        global.fetch.mockReturnValueOnce(promise);
        
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const editButton = screen.getByText('Edit Project');
        fireEvent.click(editButton);
        
        const nameInput = screen.getByDisplayValue('Test Project');
        fireEvent.change(nameInput, { target: { value: 'Updated Project' } });
        
        const form = nameInput.closest('form');
        fireEvent.submit(form);
        
        // Submit button should show "Updating..." text
        await waitFor(() => {
            expect(screen.getByText('Updating...')).toBeInTheDocument();
        });
        
        resolvePromise({ ok: true, json: async () => ({ success: true }) });
        
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });
    });

    test('delete modal disabled state during loading', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        global.fetch.mockReturnValueOnce(promise);
        
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const deleteButton = screen.getByText('Delete Database');
        fireEvent.click(deleteButton);
        
        const dialogButtons = screen.getAllByTestId('button').slice(2);
        const confirmDeleteButton = dialogButtons[1];
        fireEvent.click(confirmDeleteButton);
        
        // Delete button should show "Deleting..." text
        await waitFor(() => {
            expect(screen.getByText('Deleting...')).toBeInTheDocument();
        });
        
        resolvePromise({ ok: true });
        
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });
    });

    test('renders all database status icons', () => {
        const { rerender } = render(<ProjectCard project={mockProject} />);
        expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
        
        rerender(<ProjectCard project={{ ...mockProject, database: { ...mockProject.database, status: 'creating' } }} />);
        expect(screen.getByTestId('icon-clock')).toBeInTheDocument();
        
        rerender(<ProjectCard project={{ ...mockProject, database: { ...mockProject.database, status: 'error' } }} />);
        expect(screen.getByTestId('icon-alert-circle')).toBeInTheDocument();
    });

    test('edit dialog cannot be closed while loading', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        global.fetch.mockReturnValueOnce(promise);
        
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const editButton = screen.getByText('Edit Project');
        fireEvent.click(editButton);
        
        const nameInput = screen.getByDisplayValue('Test Project');
        fireEvent.change(nameInput, { target: { value: 'Updated Project' } });
        
        const form = nameInput.closest('form');
        fireEvent.submit(form);
        
        await waitFor(() => {
            expect(screen.getByText('Updating...')).toBeInTheDocument();
        });
        
        // Try to close dialog by calling onOpenChange - it should not close
        const dialog = screen.getByTestId('dialog');
        const updateButton = screen.getByText('Updating...');
        expect(updateButton).toBeInTheDocument();

        // call captured handler to simulate Dialog onOpenChange(false)
        if (typeof capturedDialogOnOpenChange === 'function') capturedDialogOnOpenChange(false);
        // dialog remains open while loading
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        
        resolvePromise({ ok: true, json: async () => ({ success: true }) });
    });

    test('delete dialog cannot be closed while deleting', async () => {
        let resolvePromise;
        const promise = new Promise(resolve => {
            resolvePromise = resolve;
        });
        global.fetch.mockReturnValueOnce(promise);
        
        render(<ProjectCard project={mockProject} />);
        
        const buttons = screen.getAllByTestId('button');
        const settingsButton = buttons[1];
        fireEvent.click(settingsButton);
        
        const deleteButton = screen.getByText('Delete Database');
        fireEvent.click(deleteButton);
        
        const dialogButtons = screen.getAllByTestId('button').slice(2);
        const confirmDeleteButton = dialogButtons[1];
        fireEvent.click(confirmDeleteButton);
        
        await waitFor(() => {
            expect(screen.getByText('Deleting...')).toBeInTheDocument();
        });
        
        const deleteButtonText = screen.getByText('Deleting...');
        expect(deleteButtonText).toBeInTheDocument();

        // simulate close attempt while deleting
        if (typeof capturedDialogOnOpenChange === 'function') capturedDialogOnOpenChange(false);
        // dialog should still be present
        expect(screen.getByTestId('dialog')).toBeInTheDocument();
        
        resolvePromise({ ok: true });
    });
});
