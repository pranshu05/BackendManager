import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Query from '@/components/(projects)/query';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useParams: () => ({ slug: 'test-project-123' })
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Sparkles: ({ className }) => <div className={className} data-testid="sparkles-icon" />,
    Send: ({ className }) => <div className={className} data-testid="send-icon" />,
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, className, disabled }) => (
        <button onClick={onClick} className={className} disabled={disabled} data-testid="submit-button">
            {children}
        </button>
    ),
}));

// Mock DotLottieReact
jest.mock('@lottiefiles/dotlottie-react', () => ({
    DotLottieReact: ({ className, src, loop, autoplay, style }) => (
        <div className={className} style={style} data-testid="lottie-animation" />
    ),
}));

describe('Query Component', () => {
    const projectId = 'test-project-123';

    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
        global.alert = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Initial Load - Suggestions Loading', () => {
        test('should display loading state when suggestions are being fetched', async () => {
            global.fetch.mockImplementationOnce(() => new Promise(() => { })); // Never resolves

            render(<Query />);

            await waitFor(() => {
                expect(screen.getByText('Generating suggestions')).toBeInTheDocument();
                expect(screen.getByText('Hang tight — getting ideas for you')).toBeInTheDocument();
            });
        });

        test('should show 4 placeholder skeleton loaders while loading suggestions', async () => {
            global.fetch.mockImplementationOnce(() => new Promise(() => { }));

            render(<Query />);

            await waitFor(() => {
                const placeholders = document.querySelectorAll('.animate-pulse');
                expect(placeholders.length).toBeGreaterThanOrEqual(4);
            });
        });

        test('should display lottie animation during suggestions loading', async () => {
            global.fetch.mockImplementationOnce(() => new Promise(() => { }));

            render(<Query />);

            await waitFor(() => {
                expect(screen.getByTestId('lottie-animation')).toBeInTheDocument();
            });
        });

        test('should fetch suggestions on component mount', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ suggestions: ['Show all users', 'Count records'] }),
            });

            render(<Query />);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(`/api/ai/query-suggestions/${projectId}`);
            });
        });

            test('should show failed suggestions and a retry button when suggestions fetch fails', async () => {
                // First call fails and should show the error block with retry
                global.fetch.mockRejectedValueOnce(new Error('Fetch failure'));

                render(<Query />);

                await waitFor(() => {
                    expect(screen.getByText(/Failed to load suggestions/)).toBeInTheDocument();
                    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
                });

                // On retry, we return suggestions and the suggestions should appear
                global.fetch.mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Suggestion after retry'] }),
                });

                const retryButton = screen.getByRole('button', { name: /Retry/i });
                userEvent.click(retryButton);

                await waitFor(() => {
                    expect(screen.getByText('Suggestion after retry')).toBeInTheDocument();
                });
            });
    });

    describe('Suggestions Loaded State', () => {
        test('should display suggestions as buttons once loaded', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ suggestions: ['Show all users', 'Count records', 'List departments'] }),
            });

            render(<Query />);

            await waitFor(() => {
                expect(screen.getByText('Show all users')).toBeInTheDocument();
                expect(screen.getByText('Count records')).toBeInTheDocument();
                expect(screen.getByText('List departments')).toBeInTheDocument();
            });
        });

        test('should display query input area with ask database text', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ suggestions: ['Show all users'] }),
            });

            render(<Query />);

            await waitFor(() => {
                expect(screen.getByText('Ask Your Database')).toBeInTheDocument();
            });
        });

        test('should have textarea with placeholder text', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ suggestions: ['Show all users'] }),
            });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                expect(textarea).toBeInTheDocument();
            });
        });

        test('should display Run Query button', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ suggestions: ['Show all users'] }),
            });

            render(<Query />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /Run Query/i })).toBeInTheDocument();
            });
        });

        test('should display sparkles icon next to each suggestion', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ suggestions: ['Show all users'] }),
            });

            render(<Query />);

            await waitFor(() => {
                const sparklesIcons = screen.getAllByTestId('sparkles-icon');
                expect(sparklesIcons.length).toBeGreaterThan(0);
            });
        });

        test('should populate textarea when suggestion button is clicked', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ suggestions: ['Show all users'] }),
            });

            render(<Query />);

            await waitFor(() => {
                const suggestionButton = screen.getByText('Show all users');
                fireEvent.click(suggestionButton);

                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                expect(textarea.value).toBe('Show all users');
            });
        });
    });

    describe('Query Execution - Empty Query', () => {
        test('should show alert when trying to run empty query', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ suggestions: ['Show all users'] }),
            });

            render(<Query />);

            await waitFor(() => {
                const runButton = screen.getByRole('button', { name: /Run Query/i });
                fireEvent.click(runButton);

                expect(global.alert).toHaveBeenCalledWith('enter a valid query');
            });
        });

        test('should show alert when query is only whitespace', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ suggestions: ['Show all users'] }),
            });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: '   ' } });

                const runButton = screen.getByRole('button', { name: /Run Query/i });
                fireEvent.click(runButton);

                expect(global.alert).toHaveBeenCalled();
            });
        });
    });

    describe('Query Execution - Success Path', () => {
        test('should execute query successfully and display results', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show all users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        updateAnalysis: { operations: ['SELECT * FROM users'] },
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        results: [
                            {
                                queryResult: [
                                    { id: 1, name: 'John Doe', department: 'HR' },
                                    { id: 2, name: 'Jane Smith', department: 'IT' },
                                ],
                            },
                        ],
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show all users' } });

                const runButton = screen.getByRole('button', { name: /Run Query/i });
                fireEvent.click(runButton);
            });

            await waitFor(() => {
                expect(screen.getByText('Your Query:')).toBeInTheDocument();
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
        });

        test('should display query results in table format', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        results: [
                            {
                                queryResult: [
                                    { id: 1, name: 'John', email: 'john@test.com' },
                                ],
                            },
                        ],
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('id')).toBeInTheDocument();
                expect(screen.getByText('name')).toBeInTheDocument();
                expect(screen.getByText('email')).toBeInTheDocument();
            });
        });

        test('should display query result data rows in table', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        results: [
                            {
                                queryResult: [
                                    { id: 1, name: 'John', email: 'john@test.com' },
                                ],
                            },
                        ],
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('1')).toBeInTheDocument();
                expect(screen.getByText('John')).toBeInTheDocument();
                expect(screen.getByText('john@test.com')).toBeInTheDocument();
            });
        });

        test('should clear textarea after successful query execution', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        results: [
                            {
                                queryResult: [{ id: 1, name: 'John' }],
                            },
                        ],
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                expect(textarea.value).toBe('');
            });
        });

        test('should disable button while query is loading', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockImplementationOnce(() => new Promise(() => { })); // Never resolves

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                const button = screen.getByRole('button', { name: /Running/i });
                expect(button).toBeDisabled();
            });
        });

        test('should show Running... text while query is executing', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockImplementationOnce(() => new Promise(() => { }));

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Running...')).toBeInTheDocument();
            });
        });

        test('should render lottie loader inside the Run Query button while executing', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                // This third call never resolves which simulates a long-running query
                .mockImplementationOnce(() => new Promise(() => { }));

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                const submitButton = screen.getByTestId('submit-button');
                expect(submitButton).toHaveTextContent('Running...');
                // DotLottieReact has data-testid "lottie-animation"
                expect(submitButton.querySelector('[data-testid="lottie-animation"]')).toBeTruthy();
            });
        });
    });

    describe('Query Execution - Error Path with Parsed Error', () => {
        test('should display parsed error when query execution fails', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        errors: [
                            { error: 'Table not found', sql: 'SELECT * FROM nonexistent' },
                        ],
                        results: [],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        parsed: {
                            errorType: 'Syntax Error',
                            summary: 'Invalid SQL syntax',
                            userFriendlyExplanation: 'Your query has invalid syntax',
                            fix: 'Check your syntax',
                        },
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Syntax Error')).toBeInTheDocument();
                expect(screen.getByText('Invalid SQL syntax')).toBeInTheDocument();
            });
        });

        test('should handle error parsing failure gracefully', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        errors: [{ error: 'Some error', sql: 'SELECT *' }],
                        results: [],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: false }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Unknown')).toBeInTheDocument();
                expect(screen.getByText('An error occurred')).toBeInTheDocument();
            });
        });

        test('should handle error parsing network error', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        errors: [{ error: 'Some error', sql: 'SELECT *' }],
                        results: [],
                    }),
                })
                .mockRejectedValueOnce(new Error('Network error'));

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Unknown')).toBeInTheDocument();
            });
        });

        test('should display error with foreign key explanation if present', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        errors: [{ error: 'FK constraint', sql: 'SELECT *' }],
                        results: [],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        parsed: {
                            errorType: 'Foreign Key Error',
                            summary: 'FK constraint violated',
                            userFriendlyExplanation: 'FK error explanation',
                            foreignKeyExplanation: 'You need to check dependencies',
                        },
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Understanding Dependencies:')).toBeInTheDocument();
                expect(screen.getByText('You need to check dependencies')).toBeInTheDocument();
            });
        });

        test('should display technical details when available', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        errors: [{ error: 'Some error', sql: 'SELECT *' }],
                        results: [],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        parsed: {
                            errorType: 'Error',
                            summary: 'Error occurred',
                            userFriendlyExplanation: 'Error explanation',
                            techdetail: { originalError: 'Original error details' },
                        },
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('View technical details')).toBeInTheDocument();
            });
        });

        test('should be able to close error message', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        errors: [{ error: 'Some error', sql: 'SELECT *' }],
                        results: [],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        parsed: {
                            errorType: 'Error',
                            summary: 'Error occurred',
                            userFriendlyExplanation: 'Error explanation',
                        },
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Error')).toBeInTheDocument();
            });

            const closeButton = document.querySelector('.cursor-pointer svg');
            fireEvent.click(closeButton);

            await waitFor(() => {
                expect(screen.queryByText('Error occurred')).not.toBeInTheDocument();
            });
        });
    });

    describe('No Data Found Path', () => {
        test('should display no data found error when query returns empty results', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        errors: [],
                        results: [{ queryResult: [] }],
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show nonexistent' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('No Data Found')).toBeInTheDocument();
                expect(screen.getByText('No matching data found in your database')).toBeInTheDocument();
            });
        });

        test('should display query in no data found error', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        errors: [],
                        results: [{ queryResult: [] }],
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show nonexistent' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Show nonexistent')).toBeInTheDocument();
            });
        });
    });

    describe('Query Execution - Network Error', () => {
        test('should handle network error during query execution', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockRejectedValueOnce(new Error('Network error'));

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Connection Error')).toBeInTheDocument();
                expect(screen.getByText('Failed to execute query')).toBeInTheDocument();
            });
        });
    });

    describe('Table Headers Extraction', () => {
        test('should extract and display table headers from query results', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        results: [
                            {
                                queryResult: [
                                    { userId: 1, userName: 'John', userEmail: 'john@test.com' },
                                    { userId: 2, userName: 'Jane', userEmail: 'jane@test.com' },
                                ],
                            },
                        ],
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('userId')).toBeInTheDocument();
                expect(screen.getByText('userName')).toBeInTheDocument();
                expect(screen.getByText('userEmail')).toBeInTheDocument();
            });
        });

        test('should not update headers when no query result', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ suggestions: ['Show users'] }),
            });

            render(<Query />);

            await waitFor(() => {
                expect(screen.getByText('Ask anything about your data')).toBeInTheDocument();
            });
        });
    });

    describe('Initial Help Text', () => {
        test('should display help text when no results and no error', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ suggestions: ['Show users'] }),
            });

            render(<Query />);

            await waitFor(() => {
                expect(screen.getByText('Ask anything about your data')).toBeInTheDocument();
                expect(screen.getByText(/Use natural language to query your database/i)).toBeInTheDocument();
            });
        });
    });

    describe('Multiple Query Execution', () => {
        test('should allow executing multiple queries in sequence', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users', 'Show products'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        results: [{ queryResult: [{ id: 1, name: 'John' }] }],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        results: [{ queryResult: [{ id: 1, productName: 'Product A' }] }],
                    }),
                });

            render(<Query />);

            // First query
            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Your Query:')).toBeInTheDocument();
                expect(screen.getByText('John')).toBeInTheDocument();
            });

            // Second query
            const suggestionButtons = screen.getAllByRole('button').filter(btn => btn.textContent.includes('Show products'));
            if (suggestionButtons.length > 0) {
                fireEvent.click(suggestionButtons[0]);

                await waitFor(() => {
                    const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                    expect(textarea.value).toBe('Show products');
                });

                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));

                await waitFor(() => {
                    expect(screen.getByText('Product A')).toBeInTheDocument();
                });
            }
        });
    });

    describe('Error with Details', () => {
        test('should display error with all details: type, summary, explanation and fix', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show users'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        errors: [{ error: 'Some error', sql: 'SELECT *' }],
                        results: [],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        parsed: {
                            errorType: 'Validation Error',
                            summary: 'Invalid input',
                            userFriendlyExplanation: 'Your input was invalid',
                            fix: 'Check your input format',
                        },
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show users' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Validation Error')).toBeInTheDocument();
                expect(screen.getByText('Invalid input')).toBeInTheDocument();
                expect(screen.getByText('Your input was invalid')).toBeInTheDocument();
            });
        });
    });

    describe('Textarea User Input', () => {
        test('should update textarea value when user types', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ suggestions: ['Show users'] }),
            });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Custom query text' } });
                expect(textarea.value).toBe('Custom query text');
            });
        });
    });

    describe('Additional Coverage Tests', () => {
        test('should properly handle query result with null values in data', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Show all'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT *'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        results: [
                            {
                                queryResult: [
                                    { id: 1, name: null, value: 'test' },
                                ],
                            },
                        ],
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Show all' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('test')).toBeInTheDocument();
            });
        });

        test('should render table with single row correctly', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Single row'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT * LIMIT 1'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        results: [
                            {
                                queryResult: [{ id: 1, data: 'single' }],
                            },
                        ],
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Single row' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('single')).toBeInTheDocument();
            });
        });

        test('should handle error parsing with all optional fields', async () => {
            global.fetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ suggestions: ['Test'] }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ updateAnalysis: { operations: ['SELECT'] } }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        errors: [{ error: 'Test error', sql: 'SELECT' }],
                        results: [],
                    }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({
                        success: true,
                        parsed: {
                            errorType: 'Complete Error',
                            summary: 'Complete summary',
                            userFriendlyExplanation: 'Complete explanation',
                            foreignKeyExplanation: 'FK explanation',
                            techdetail: { originalError: 'Technical detail' },
                        },
                    }),
                });

            render(<Query />);

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText(/Ask your database in plain English/i);
                fireEvent.change(textarea, { target: { value: 'Test' } });
                fireEvent.click(screen.getByRole('button', { name: /Run Query/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Complete Error')).toBeInTheDocument();
            });
        });
    });
});
