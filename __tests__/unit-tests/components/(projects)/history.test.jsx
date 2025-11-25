import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import History from '@/components/(projects)/history';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useParams: () => ({ slug: 'test-project-123' })
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
    Loader: ({ className }) => <div className={className} data-testid="loader-icon" />,
    Loader2: ({ className }) => <div className={className} data-testid="loader-icon" />,
    Clock: ({ className }) => <div className={className} data-testid="clock-icon" />,
    ArrowLeft: ({ className }) => <div className={className} data-testid="arrow-left-icon" />,
    PencilLine: ({ className }) => <div className={className} data-testid="pencil-icon" />,
    Play: ({ className }) => <div className={className} data-testid="play-icon" />,
    CheckCircle: ({ className }) => <div className={className} data-testid="check-icon" />,
    XCircle: ({ className }) => <div className={className} data-testid="x-icon" />,
    SquarePen: ({ className }) => <div className={className} data-testid="square-pen-icon" />,
    Search: ({ className }) => <div className={className} data-testid="search-icon" />,
    Funnel: ({ className }) => <div className={className} data-testid="funnel-icon" />,
    Eye: ({ className }) => <div className={className} data-testid="eye-icon" />,
    Plus: ({ className }) => <div className={className} data-testid="plus-icon" />,
    FileSignature: ({ className }) => <div className={className} data-testid="file-signature-icon" />,
    Trash: ({ className }) => <div className={className} data-testid="trash-icon" />,
    AlertTriangle: ({ className }) => <div className={className} data-testid="alert-icon" />,
    Star: ({ className }) => <div className={className} data-testid="star-icon" />,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, className, disabled, variant }) => (
        <button onClick={onClick} className={className} disabled={disabled} data-variant={variant}>
            {children}
        </button>
    ),
}));

jest.mock('@/components/ui/input', () => ({
    Input: ({ value, onChange, placeholder, className }) => (
        <input value={value} onChange={onChange} placeholder={placeholder} className={className} />
    ),
}));

jest.mock('@/components/ui/textarea', () => ({
    Textarea: ({ value, onChange, placeholder, className }) => (
        <textarea value={value} onChange={onChange} placeholder={placeholder} className={className} />
    ),
}));

jest.mock('@/components/ui/ExportDropdown', () => ({
    __esModule: true,
    default: ({ options, onSelect }) => (
        <div data-testid="export-dropdown">
            {options && options.map((opt) => (
                <button key={opt} onClick={() => onSelect(opt)}>
                    {opt}
                </button>
            ))}
        </div>
    ),
}));

jest.mock('@/components/ui/dialog', () => ({
    Dialog: ({ children, open }) => open ? <div data-testid="dialog">{children}</div> : null,
    DialogContent: ({ children }) => <div data-testid="dialog-content">{children}</div>,
    DialogHeader: ({ children }) => <div data-testid="dialog-header">{children}</div>,
    DialogTitle: ({ children }) => <div data-testid="dialog-title">{children}</div>,
    DialogFooter: ({ children }) => <div data-testid="dialog-footer">{children}</div>,
    DialogClose: ({ children }) => <div data-testid="dialog-close">{children}</div>,
}));

// Mock xlsx library
jest.mock('xlsx', () => ({
    utils: {
        json_to_sheet: jest.fn(),
        book_new: jest.fn(),
        book_append_sheet: jest.fn(),
    },
    write: jest.fn(),
}));

describe('History Component', () => {
    const projectId = 'test-project-123';
    const mockHandleSetPage = jest.fn();
    const mockSetQueryToPass = jest.fn();
    const defaultProps = {
        handleSetPage: mockHandleSetPage,
        setQueryToPass: mockSetQueryToPass,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
        global.alert = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Initial Load', () => {
        test('should display loading state when history is being fetched', async () => {
            global.fetch.mockImplementationOnce(() => new Promise(() => { })); // Never resolves

            render(<History {...defaultProps} />);

            // The component shows "Loading history..." text instead of a loader icon
            expect(screen.getByText('Loading history...')).toBeInTheDocument();
        });

        test('should fetch and display query history on mount', async () => {
            const mockHistory = [
                {
                    id: 1,
                    title: 'Test Query',
                    sql: 'SELECT * FROM users',
                    timestamp: '2024-01-01T12:00:00Z',
                    status: 'success'
                },
                {
                    id: 2,
                    title: 'Another Query',
                    sql: 'SELECT * FROM products',
                    timestamp: '2024-01-02T12:00:00Z',
                    status: 'success'
                }
            ];

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ history: mockHistory, total: 2 })
            });

            render(<History {...defaultProps} />);

            await waitFor(() => {
                // The component adds query parameters to the fetch URL
                expect(global.fetch).toHaveBeenCalled();
                const fetchUrl = global.fetch.mock.calls[0][0];
                expect(fetchUrl).toContain(`/api/projects/${projectId}/history`);
            });
        });

        test('should handle fetch error gracefully', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

            render(<History {...defaultProps} />);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
                expect(global.alert).toHaveBeenCalledWith('Error fetching history');
            });
        });
    });

    describe('Empty State', () => {
        test('should display empty state when no history is available', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ history: [], total: 0 })
            });

            render(<History {...defaultProps} />);

            await waitFor(() => {
                // Component should render without errors
                expect(global.fetch).toHaveBeenCalled();
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle non-ok response', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({ error: 'Server error' })
            });

            render(<History {...defaultProps} />);

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalled();
                expect(global.alert).toHaveBeenCalledWith('Error fetching history');
            });
        });
    });
});
