import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import SupportSection from '@/components/(help)/SupportSection';
import { showToast } from 'nextjs-toast-notify';

// Mock nextjs-toast-notify
jest.mock('nextjs-toast-notify', () => ({
    showToast: {
        success: jest.fn(),
        error: jest.fn(),
    },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Ticket: ({ className }) => <div className={className} data-testid="ticket-icon" />,
    Plus: ({ className }) => <div className={className} data-testid="plus-icon" />,
    Trash2: ({ className }) => <div className={className} data-testid="trash-icon" />,
    AlertCircle: ({ className }) => <div className={className} data-testid="alert-icon" />,
    CheckCircle: ({ className }) => <div className={className} data-testid="check-icon" />,
    Clock: ({ className }) => <div className={className} data-testid="clock-icon" />,
    XCircle: ({ className }) => <div className={className} data-testid="x-icon" />,
    MessageSquare: ({ className }) => <div className={className} data-testid="message-icon" />,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
    Card: ({ children }) => <div data-testid="card" className="card">{children}</div>,
    CardContent: ({ children }) => <div data-testid="card-content" className="card-content">{children}</div>,
    CardHeader: ({ children }) => <div data-testid="card-header" className="card-header">{children}</div>,
    CardTitle: ({ children }) => <div data-testid="card-title" className="card-title">{children}</div>,
    CardDescription: ({ children }) => <div data-testid="card-description" className="card-description">{children}</div>,
}));

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

jest.mock('@/components/ui/input', () => ({
    Input: ({ value, onChange, placeholder, type, id, maxLength, required }) => (
        <input
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            type={type}
            maxLength={maxLength}
            required={required}
            data-testid="input"
        />
    ),
}));

jest.mock('@/components/ui/label', () => ({
    Label: ({ children, htmlFor }) => (
        <label htmlFor={htmlFor} data-testid="label">
            {children}
        </label>
    ),
}));

jest.mock('@/components/ui/textarea', () => ({
    Textarea: ({ value, onChange, placeholder, rows, id, required }) => (
        <textarea
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            required={required}
            data-testid="textarea"
        />
    ),
}));

describe('SupportSection Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
        global.confirm = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Initial Rendering', () => {
        test('should render without crashing', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            const { container } = render(<SupportSection />);
            expect(container).toBeInTheDocument();
        });

        test('should render Support Tickets title', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('Support Tickets')).toBeInTheDocument();
            });
        });

        test('should render MessageSquare icon', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByTestId('message-icon')).toBeInTheDocument();
            });
        });

        test('should render description text', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText(/Raise a support ticket and our team will get back to you via email/)).toBeInTheDocument();
            });
        });

        test('should render New Ticket button', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('New Ticket')).toBeInTheDocument();
            });
        });

        test('should render Your Tickets section', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText(/Your Tickets/)).toBeInTheDocument();
            });
        });
    });

    describe('Fetch Tickets', () => {
        test('should fetch tickets on component mount', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith('/api/support');
            });
        });

        test('should display loading state initially', async () => {
            global.fetch.mockImplementationOnce(() => new Promise(() => {}));

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('Loading tickets...')).toBeInTheDocument();
            });
        });

        test('should handle fetch error gracefully', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Fetch error'));

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('No support tickets yet')).toBeInTheDocument();
            });
        });

        test('should display no tickets message when list is empty', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('No support tickets yet')).toBeInTheDocument();
                expect(screen.getByText(/Create a new ticket to get help/)).toBeInTheDocument();
            });
        });

        test('should display tickets when fetched successfully', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test Ticket',
                            message: 'Test message',
                            category: 'general',
                            priority: 'medium',
                            status: 'active',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('Test Ticket')).toBeInTheDocument();
            });
        });

        test('should default to empty ticket list when API response has no tickets', async () => {
            // API returns an object with no tickets property
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({}),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('No support tickets yet')).toBeInTheDocument();
            });
        });
    });

    describe('Create Ticket Form', () => {
        test('should not show form initially', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.queryByPlaceholderText(/Brief description of your issue/)).not.toBeInTheDocument();
            });
        });

        test('should show form when New Ticket button is clicked', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                const button = screen.getByText('New Ticket');
                fireEvent.click(button);
            });

            await waitFor(() => {
                expect(screen.getByPlaceholderText(/Brief description of your issue/)).toBeInTheDocument();
            });
        });

        test('should hide form when Cancel button is clicked', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                fireEvent.click(screen.getByText('Cancel'));
            });

            await waitFor(() => {
                expect(screen.queryByPlaceholderText(/Brief description of your issue/)).not.toBeInTheDocument();
            });
        });

        test('should have all form fields', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                expect(screen.getByLabelText('Category')).toBeInTheDocument();
                expect(screen.getByLabelText('Priority')).toBeInTheDocument();
                expect(screen.getByLabelText('Subject *')).toBeInTheDocument();
                expect(screen.getByLabelText('Message *')).toBeInTheDocument();
            });
        });

        test('should have correct category options', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                const categorySelect = screen.getByLabelText('Category');
                expect(categorySelect).toBeInTheDocument();
                fireEvent.click(categorySelect);
            });
        });

        test('should have correct priority options', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                const prioritySelect = screen.getByLabelText('Priority');
                expect(prioritySelect).toBeInTheDocument();
            });
        });
    });

    describe('Form Submission', () => {
        test('should show error toast when subject is empty', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            const { rerender } = render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            // Wait for form to be visible
            await waitFor(() => {
                expect(screen.getByText('Submit Ticket')).toBeInTheDocument();
            });

            // Clear the subject field and try to submit
            const form = screen.getByPlaceholderText(/Provide detailed information/).closest('form');
            fireEvent.submit(form);

            // Check that error was called
            expect(showToast.error).toHaveBeenCalled();
        });

        test('should show error toast when message is empty', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            // Wait for form to be visible
            await waitFor(() => {
                expect(screen.getByText('Submit Ticket')).toBeInTheDocument();
            });

            // Fill subject but leave message empty
            const subjectInput = screen.getByPlaceholderText(/Brief description/);
            fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });

            // Submit empty message form
            const form = screen.getByPlaceholderText(/Provide detailed information/).closest('form');
            fireEvent.submit(form);

            // Check that error was called
            expect(showToast.error).toHaveBeenCalled();
        });

        test('should submit ticket successfully with all fields', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tickets: [] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 1 }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tickets: [] }),
                });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                const subjectInput = screen.getByPlaceholderText(/Brief description/);
                const messageInput = screen.getByPlaceholderText(/Provide detailed information/);
                fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
                fireEvent.change(messageInput, { target: { value: 'Test Message' } });
                fireEvent.click(screen.getByText('Submit Ticket'));
            });

            await waitFor(() => {
                expect(showToast.success).toHaveBeenCalledWith(
                    expect.stringContaining('Support ticket created successfully'),
                    expect.any(Object)
                );
            });
        });

        test('should clear form after successful submission', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tickets: [] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 1 }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tickets: [] }),
                });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                const subjectInput = screen.getByPlaceholderText(/Brief description/);
                const messageInput = screen.getByPlaceholderText(/Provide detailed information/);
                fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
                fireEvent.change(messageInput, { target: { value: 'Test Message' } });
                fireEvent.click(screen.getByText('Submit Ticket'));
            });

            await waitFor(() => {
                expect(screen.queryByText('Submit Ticket')).not.toBeInTheDocument();
            });
        });

        test('should hide form after successful submission', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tickets: [] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 1 }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tickets: [] }),
                });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                const subjectInput = screen.getByPlaceholderText(/Brief description/);
                const messageInput = screen.getByPlaceholderText(/Provide detailed information/);
                fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
                fireEvent.change(messageInput, { target: { value: 'Test Message' } });
                fireEvent.click(screen.getByText('Submit Ticket'));
            });

            await waitFor(() => {
                expect(screen.queryByPlaceholderText(/Brief description/)).not.toBeInTheDocument();
            });
        });

        test('should handle submission error', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tickets: [] }),
                })
                .mockResolvedValueOnce({
                    ok: false,
                    json: async () => ({ error: 'Server error' }),
                });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                const subjectInput = screen.getByPlaceholderText(/Brief description/);
                const messageInput = screen.getByPlaceholderText(/Provide detailed information/);
                fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
                fireEvent.change(messageInput, { target: { value: 'Test Message' } });
                fireEvent.click(screen.getByText('Submit Ticket'));
            });

            await waitFor(() => {
                expect(showToast.error).toHaveBeenCalled();
            });
        });

        test('should show default message when create fails without server error', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tickets: [] }),
                })
                .mockResolvedValueOnce({
                    ok: false,
                    json: async () => ({}),
                });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                const subjectInput = screen.getByPlaceholderText(/Brief description/);
                const messageInput = screen.getByPlaceholderText(/Provide detailed information/);
                fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
                fireEvent.change(messageInput, { target: { value: 'Test Message' } });
                fireEvent.click(screen.getByText('Submit Ticket'));
            });

            await waitFor(() => {
                expect(showToast.error).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to create support ticket'),
                    expect.any(Object)
                );
            });
        });

        test('should handle submission network error', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tickets: [] }),
                })
                .mockRejectedValueOnce(new Error('Network error'));

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                const subjectInput = screen.getByPlaceholderText(/Brief description/);
                const messageInput = screen.getByPlaceholderText(/Provide detailed information/);
                fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
                fireEvent.change(messageInput, { target: { value: 'Test Message' } });
                fireEvent.click(screen.getByText('Submit Ticket'));
            });

            await waitFor(() => {
                expect(showToast.error).toHaveBeenCalledWith(
                    expect.stringContaining('error occurred while creating the ticket'),
                    expect.any(Object)
                );
            });
        });

        test('should disable submit button while submitting', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tickets: [] }),
                })
                .mockImplementationOnce(() => new Promise(() => {}));

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                const subjectInput = screen.getByPlaceholderText(/Brief description/);
                const messageInput = screen.getByPlaceholderText(/Provide detailed information/);
                fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
                fireEvent.change(messageInput, { target: { value: 'Test Message' } });
                fireEvent.click(screen.getByText('Submit Ticket'));
            });

            await waitFor(() => {
                const submitButton = screen.getByText(/Submitting/);
                expect(submitButton).toBeDisabled();
            });
        });
    });

    describe('Ticket Display', () => {
        test('should display ticket subject', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'My Test Issue',
                            message: 'Detailed issue description',
                            category: 'technical',
                            priority: 'high',
                            status: 'in_progress',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('My Test Issue')).toBeInTheDocument();
            });
        });

        test('should display ticket message', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test Issue',
                            message: 'Detailed issue description',
                            category: 'technical',
                            priority: 'high',
                            status: 'active',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('Detailed issue description')).toBeInTheDocument();
            });
        });

        test('should display ticket status badge', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test Issue',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'solved',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('Solved')).toBeInTheDocument();
            });
        });

        test('should display ticket priority', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test Issue',
                            message: 'Message',
                            category: 'general',
                            priority: 'urgent',
                            status: 'active',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText(/Priority: Urgent/)).toBeInTheDocument();
            });
        });

        test('should display ticket category', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Billing Question',
                            message: 'Message',
                            category: 'billing',
                            priority: 'medium',
                            status: 'active',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('Billing')).toBeInTheDocument();
            });
        });

        test('should display created date', async () => {
            const testDate = new Date('2024-01-15T10:30:00');
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test Issue',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'active',
                            created_at: testDate.toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText(/Created:/)).toBeInTheDocument();
            });
        });

        test('should display all status types correctly', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Ticket One Active',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'active',
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: 2,
                            subject: 'Ticket Two Progress',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'in_progress',
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: 3,
                            subject: 'Ticket Three Solved',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'solved',
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: 4,
                            subject: 'Ticket Four Inactive',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'inactive',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('Ticket One Active')).toBeInTheDocument();
                expect(screen.getByText('Ticket Two Progress')).toBeInTheDocument();
                expect(screen.getByText('Ticket Three Solved')).toBeInTheDocument();
                expect(screen.getByText('Ticket Four Inactive')).toBeInTheDocument();
            });
        });

        test('should render fallback values for unknown status/priority/category', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Mystery',
                            message: 'Unknown values',
                            category: 'interstellar',
                            priority: 'super',
                            status: 'mystery_status',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                // Unknown status falls back to 'Active'
                expect(screen.getByText('Active')).toBeInTheDocument();

                // Unknown priority falls back to the raw priority string
                expect(screen.getByText(/Priority: super/)).toBeInTheDocument();

                // Unknown category falls back to the raw category string
                expect(screen.getByText('interstellar')).toBeInTheDocument();

                // Default icon fallback is Clock
                expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
            });
        });

        test('should display admin notes when present', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'active',
                            created_at: new Date().toISOString(),
                            admin_notes: 'We are working on this issue',
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('Admin Notes:')).toBeInTheDocument();
                expect(screen.getByText('We are working on this issue')).toBeInTheDocument();
            });
        });

        test('should not display admin notes when not present', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'active',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.queryByText('Admin Notes:')).not.toBeInTheDocument();
            });
        });

        test('should display resolved date when ticket is solved', async () => {
            const resolvedDate = new Date('2024-01-20T15:45:00');
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'solved',
                            created_at: new Date().toISOString(),
                            resolved_at: resolvedDate.toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText(/Resolved:/)).toBeInTheDocument();
            });
        });
    });

    describe('Delete Ticket', () => {
        test('should show delete button for non-solved tickets', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'active',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                const deleteButton = screen.getByTestId('trash-icon').parentElement;
                expect(deleteButton).toBeInTheDocument();
            });
        });

        test('should not show delete button for solved tickets', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'solved',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                const trashIcons = screen.queryAllByTestId('trash-icon');
                expect(trashIcons.length).toBe(0);
            });
        });

        test('should confirm before deleting ticket', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'active',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            global.confirm.mockReturnValueOnce(false);

            render(<SupportSection />);

            await waitFor(() => {
                const deleteButton = screen.getByTestId('trash-icon').parentElement;
                fireEvent.click(deleteButton);
            });

            await waitFor(() => {
                expect(global.confirm).toHaveBeenCalled();
                expect(global.fetch).not.toHaveBeenCalledWith(
                    expect.stringContaining('/api/support/'),
                    expect.objectContaining({ method: 'DELETE' })
                );
            });
        });

        test('should delete ticket when confirmed', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        tickets: [
                            {
                                id: 1,
                                subject: 'Test',
                                message: 'Message',
                                category: 'general',
                                priority: 'medium',
                                status: 'active',
                                created_at: new Date().toISOString(),
                            },
                        ],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({}),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tickets: [] }),
                });

            global.confirm.mockReturnValueOnce(true);

            render(<SupportSection />);

            await waitFor(() => {
                const deleteButton = screen.getByTestId('trash-icon').parentElement;
                fireEvent.click(deleteButton);
            });

            await waitFor(() => {
                expect(showToast.success).toHaveBeenCalledWith(
                    'Ticket deleted successfully',
                    expect.any(Object)
                );
            });
        });

        test('should handle delete error', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        tickets: [
                            {
                                id: 1,
                                subject: 'Test',
                                message: 'Message',
                                category: 'general',
                                priority: 'medium',
                                status: 'active',
                                created_at: new Date().toISOString(),
                            },
                        ],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: false,
                    json: async () => ({ error: 'Delete failed' }),
                });

            global.confirm.mockReturnValueOnce(true);

            render(<SupportSection />);

            await waitFor(() => {
                const deleteButton = screen.getByTestId('trash-icon').parentElement;
                fireEvent.click(deleteButton);
            });

            await waitFor(() => {
                expect(showToast.error).toHaveBeenCalled();
            });
        });

        test('should show default message when delete fails without server error', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        tickets: [
                            {
                                id: 1,
                                subject: 'Test',
                                message: 'Message',
                                category: 'general',
                                priority: 'medium',
                                status: 'active',
                                created_at: new Date().toISOString(),
                            },
                        ],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: false,
                    json: async () => ({}),
                });

            global.confirm.mockReturnValueOnce(true);

            render(<SupportSection />);

            await waitFor(() => {
                const deleteButton = screen.getByTestId('trash-icon').parentElement;
                fireEvent.click(deleteButton);
            });

            await waitFor(() => {
                expect(showToast.error).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to delete ticket'),
                    expect.any(Object)
                );
            });
        });

        test('should handle delete network error', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        tickets: [
                            {
                                id: 1,
                                subject: 'Test',
                                message: 'Message',
                                category: 'general',
                                priority: 'medium',
                                status: 'active',
                                created_at: new Date().toISOString(),
                            },
                        ],
                    }),
                })
                .mockRejectedValueOnce(new Error('Network error'));

            global.confirm.mockReturnValueOnce(true);

            render(<SupportSection />);

            await waitFor(() => {
                const deleteButton = screen.getByTestId('trash-icon').parentElement;
                fireEvent.click(deleteButton);
            });

            await waitFor(() => {
                expect(showToast.error).toHaveBeenCalledWith(
                    expect.stringContaining('error occurred while deleting the ticket'),
                    expect.any(Object)
                );
            });
        });
    });

    describe('Date Formatting', () => {
        test('should format date correctly', async () => {
            const testDate = new Date('2024-01-15T10:30:00');
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'active',
                            created_at: testDate.toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText(/Created:/)).toBeInTheDocument();
            });
        });
    });

    describe('Ticket Count', () => {
        test('should display correct number of tickets', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'Test 1',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'active',
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: 2,
                            subject: 'Test 2',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'active',
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: 3,
                            subject: 'Test 3',
                            message: 'Message',
                            category: 'general',
                            priority: 'medium',
                            status: 'active',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText(/Your Tickets \(3\)/)).toBeInTheDocument();
            });
        });

        test('should update ticket count after creating ticket', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ tickets: [] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ id: 1 }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        tickets: [
                            {
                                id: 1,
                                subject: 'New Ticket',
                                message: 'Message',
                                category: 'general',
                                priority: 'medium',
                                status: 'active',
                                created_at: new Date().toISOString(),
                            },
                        ],
                    }),
                });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                const subjectInput = screen.getByPlaceholderText(/Brief description/);
                const messageInput = screen.getByPlaceholderText(/Provide detailed information/);
                fireEvent.change(subjectInput, { target: { value: 'New Ticket' } });
                fireEvent.change(messageInput, { target: { value: 'Message' } });
                fireEvent.click(screen.getByText('Submit Ticket'));
            });

            await waitFor(() => {
                expect(screen.getByText(/Your Tickets \(1\)/)).toBeInTheDocument();
            });
        });
    });

    describe('Form Field Limits', () => {
        test('should limit subject length to 255 characters', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            await waitFor(() => {
                const subjectInput = screen.getByPlaceholderText(/Brief description/);
                expect(subjectInput).toHaveAttribute('maxLength', '255');
            });
        });
    });

    describe('Multiple Tickets Rendering', () => {
        test('should render multiple tickets correctly', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    tickets: [
                        {
                            id: 1,
                            subject: 'First Issue',
                            message: 'First message',
                            category: 'general',
                            priority: 'low',
                            status: 'active',
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: 2,
                            subject: 'Second Issue',
                            message: 'Second message',
                            category: 'technical',
                            priority: 'high',
                            status: 'in_progress',
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: 3,
                            subject: 'Third Issue',
                            message: 'Third message',
                            category: 'billing',
                            priority: 'urgent',
                            status: 'solved',
                            created_at: new Date().toISOString(),
                        },
                    ],
                }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByText('First Issue')).toBeInTheDocument();
                expect(screen.getByText('Second Issue')).toBeInTheDocument();
                expect(screen.getByText('Third Issue')).toBeInTheDocument();
            });
        });
    });

    describe('Icons and Visual Elements', () => {
        test('should render Ticket icon in Your Tickets section', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                const ticketIcons = screen.getAllByTestId('ticket-icon');
                expect(ticketIcons.length).toBeGreaterThan(0);
            });
        });

        test('should render Plus icon in New Ticket button', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
            });
        });

        test('should handle fetch response with !res.ok status', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Server error' }),
            });

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            render(<SupportSection />);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch tickets');
            });

            consoleSpy.mockRestore();
        });

        test('should call onChange handler when category select changes', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            // Wait a moment for form to fully render
            await waitFor(() => {
                expect(screen.getByLabelText('Category')).toBeInTheDocument();
            });

            const categorySelect = screen.getByLabelText('Category');
            // Change to a different category
            fireEvent.change(categorySelect, { target: { value: 'technical' } });
            expect(categorySelect.value).toBe('technical');
        });

        test('should call onChange handler when priority select changes', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ tickets: [] }),
            });

            render(<SupportSection />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('New Ticket'));
            });

            // Wait a moment for form to fully render
            await waitFor(() => {
                expect(screen.getByLabelText('Priority')).toBeInTheDocument();
            });

            const prioritySelect = screen.getByLabelText('Priority');
            // Change to a different priority
            fireEvent.change(prioritySelect, { target: { value: 'high' } });
            expect(prioritySelect.value).toBe('high');
        });
    });
});
