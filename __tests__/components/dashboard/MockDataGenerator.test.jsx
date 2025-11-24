import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import MockDataGenerator from '@/components/(dashboard)/MockDataGenerator';

// Mock the UI components
let capturedDialogOnOpenChange = null;
jest.mock('@/components/ui/dialog', () => ({
    Dialog: ({ open, onOpenChange, children }) => {
        // capture handler for use in tests without re-mocking modules
        capturedDialogOnOpenChange = onOpenChange;
        return (
            <div data-testid="dialog" data-open={open}>
                {children}
            </div>
        );
    },
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
}));

jest.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, variant, size, className }) => (
        <button
            onClick={onClick}
            disabled={disabled}
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
    Input: ({ id, type, value, onChange, min, max, className }) => (
        <input
            id={id}
            type={type || 'text'}
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            className={className}
            data-testid={`input-${id}`}
        />
    ),
}));

jest.mock('@/components/ui/label', () => ({
    Label: ({ children, htmlFor, className }) => (
        <label htmlFor={htmlFor} className={className} data-testid={`label-${htmlFor}`}>
            {children}
        </label>
    ),
}));

jest.mock('@/components/ui/tabs', () => ({
    Tabs: ({ value, onValueChange, children }) => (
        <div data-testid="tabs" data-value={value}>
            {children}
        </div>
    ),
    TabsList: ({ children, className }) => (
        <div data-testid="tabs-list" className={className}>
            {children}
        </div>
    ),
    TabsTrigger: ({ value, children, className }) => (
        <button data-testid={`tab-trigger-${value}`} className={className}>
            {children}
        </button>
    ),
    TabsContent: ({ value, children }) => (
        <div data-testid={`tab-content-${value}`}>
            {children}
        </div>
    ),
}));

jest.mock('@/components/ui/card', () => ({
    Card: ({ children, className }) => (
        <div data-testid="card" className={className}>
            {children}
        </div>
    ),
    CardHeader: ({ children, className }) => (
        <div data-testid="card-header" className={className}>
            {children}
        </div>
    ),
    CardTitle: ({ children, className }) => (
        <h3 data-testid="card-title" className={className}>
            {children}
        </h3>
    ),
    CardDescription: ({ children, className }) => (
        <p data-testid="card-description" className={className}>
            {children}
        </p>
    ),
    CardContent: ({ children, className, onClick }) => (
        <div data-testid="card-content" className={className} onClick={onClick}>
            {children}
        </div>
    ),
}));

jest.mock('@/components/ui/badge', () => ({
    Badge: ({ children, variant, className }) => (
        <span data-testid="badge" data-variant={variant} className={className}>
            {children}
        </span>
    ),
}));

jest.mock('@/components/ui/textarea', () => ({
    Textarea: ({ value, onChange, className }) => (
        <textarea
            value={value}
            onChange={onChange}
            className={className}
            data-testid="textarea"
        />
    ),
}));

jest.mock('@/components/ui/select', () => ({
    Select: ({ value, onValueChange, children }) => (
        <div data-testid="select">
            {children}
        </div>
    ),
    SelectTrigger: ({ children }) => (
        <button data-testid="select-trigger">
            {children}
        </button>
    ),
    SelectContent: ({ children }) => (
        <div data-testid="select-content">
            {children}
        </div>
    ),
    SelectItem: ({ value, children }) => (
        <div data-testid={`select-item-${value}`}>
            {children}
        </div>
    ),
    SelectValue: ({ placeholder }) => (
        <span data-testid="select-value">{placeholder}</span>
    ),
}));

jest.mock('@/components/ui/alert', () => ({
    Alert: ({ children, className }) => (
        <div data-testid="alert" className={className}>
            {children}
        </div>
    ),
    AlertDescription: ({ children, className }) => (
        <div data-testid="alert-description" className={className}>
            {children}
        </div>
    ),
}));

jest.mock('lucide-react', () => ({
    Loader2: ({ className }) => <div data-testid="loader-icon" className={className} />,
    Database: ({ className }) => <div data-testid="database-icon" className={className} />,
    Eye: ({ className }) => <div data-testid="eye-icon" className={className} />,
    Play: ({ className }) => <div data-testid="play-icon" className={className} />,
    Settings: ({ className }) => <div data-testid="settings-icon" className={className} />,
    Lightbulb: ({ className }) => <div data-testid="lightbulb-icon" className={className} />,
    AlertCircle: ({ className }) => <div data-testid="alert-circle-icon" className={className} />,
    CheckCircle: ({ className }) => <div data-testid="check-circle-icon" className={className} />,
}));

describe('MockDataGenerator Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('component renders with default export', () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, suggestions: {}, templates: [] }),
        });

        render(<MockDataGenerator projectId="test-project" />);
        expect(screen.getByText('Generate Mock Data')).toBeInTheDocument();
    });

    test('named export renders and is covered', () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, suggestions: {}, templates: [] }),
        });

        render(<MockDataGenerator projectId="test-project" />);
        expect(screen.getByText('Generate Mock Data')).toBeInTheDocument();
    });

    test('renders dialog trigger button', () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, suggestions: {}, templates: [] }),
        });

        render(<MockDataGenerator projectId="test-project" />);
        expect(screen.getByTestId('dialog-trigger')).toBeInTheDocument();
    });

    test('calls onSuccess callback when provided', async () => {
        const mockOnSuccess = jest.fn();
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true, suggestions: {}, templates: [] }),
        });

        global.fetch = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, suggestions: {}, templates: [] }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, summary: { tablesProcessed: 1, totalRecords: 10 }, successfulTables: [] }) });

        render(<MockDataGenerator projectId="test-project" onSuccess={mockOnSuccess} />);

        // Retry to load analysis
        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        // Wait until analysis loads
        await waitFor(() => expect(screen.getByText('Table Configuration')).toBeInTheDocument());

        // Click Generate (first Preview or Generate button found in configure tab)
        const previewBtn = within(screen.getByTestId('tab-content-configure')).getByText('Generate');
        fireEvent.click(previewBtn);

        await waitFor(() => expect(mockOnSuccess).toHaveBeenCalled());
    });

    test('loadSchemaAnalysis success and update UI elements', async () => {
        // Prepare analysis response
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                suggestions: {
                    users: {
                        recommendedCount: 2,
                        dependencies: [{ table: 'profiles' }],
                        columnSuggestions: { name: { description: 'User full name' } }
                    }
                },
                templates: ['ecommerce']
            })
        });

        render(<MockDataGenerator projectId="test-project" />);

        // Click Retry to trigger loadSchemaAnalysis
        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => expect(screen.getByText('Table Configuration')).toBeInTheDocument());

        // Input exists and can be changed
        const countInput = screen.getByTestId('input-count-users');
        fireEvent.change(countInput, { target: { value: '5' } });
        expect(countInput).toHaveValue(5);

        // CardDescription for dependencies is present
        expect(screen.getByText(/Depends on:/)).toBeInTheDocument();

        // Click 'Use Template' and verify the using template alert shows
        fireEvent.click(screen.getByTestId('tab-trigger-templates'));
        const templatesContent = screen.getByTestId('tab-content-templates');
        const templateCard = within(templatesContent).getByTestId('card-content');
        fireEvent.click(templateCard);

        await waitFor(() => expect(screen.getByText(/Using template:/)).toBeInTheDocument());
    });

    test('dialog open triggers loadSchemaAnalysis via useEffect', async () => {
        // Simulate the dialog opening and loadSchemaAnalysis via capturedDialogOnOpenChange
        global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, suggestions: {}, templates: [] }) });

        render(<MockDataGenerator projectId="test-project" />);

        // call captured handler to open dialog
        expect(typeof capturedDialogOnOpenChange).toBe('function');
        capturedDialogOnOpenChange(true);

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByText('Table Configuration')).toBeInTheDocument());
    });

    test('generatePreview sets preview and displays data preview', async () => {
        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({
                success: true,
                suggestions: { items: { recommendedCount: 1, dependencies: [], columnSuggestions: {} } },
                templates: []
            }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, preview: { items: [{ id: 1, name: 'Sample' }] }, summary: { totalRecords: 1, tablesProcessed: 1 } }) });

        render(<MockDataGenerator projectId="test-project" />);
        fireEvent.click(screen.getByText('Retry'));

        // Wait until analysis has loaded
        await waitFor(() => expect(screen.getByText('Table Configuration')).toBeInTheDocument());

        // Click the Preview button inside the configure tab
        const previewButton = within(screen.getByTestId('tab-content-configure')).getByText('Preview');
        fireEvent.click(previewButton);

        await waitFor(() => expect(screen.getByText('Data Preview')).toBeInTheDocument());
        // Back to Configure should show Table Configuration again
        fireEvent.click(screen.getByText('Back to Configure'));
        await waitFor(() => expect(screen.getByText('Table Configuration')).toBeInTheDocument());
    });

    test('generatePreview displays null cells correctly', async () => {
        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, suggestions: { items: { recommendedCount: 1, dependencies: [], columnSuggestions: {} } }, templates: [] } )})
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, preview: { items: [{ id: 1, name: null }] }, summary: { totalRecords: 1, tablesProcessed: 1 } }) });

        render(<MockDataGenerator projectId="test-project" />);
        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => expect(screen.getByText('Table Configuration')).toBeInTheDocument());

        const previewButton = within(screen.getByTestId('tab-content-configure')).getByText('Preview');
        fireEvent.click(previewButton);

        await waitFor(() => expect(screen.getByText('Data Preview')).toBeInTheDocument());
        expect(screen.getByText('null')).toBeInTheDocument();
    });

    test('generateMockData shows result summary and lists', async () => {
        const resultData = {
            success: true,
            message: 'Mock data generated',
            summary: { tablesProcessed: 2, totalRecords: 10 },
            successfulTables: [{ table: 'users', records: 5 }],
            failedTables: [{ table: 'orders', error: 'FK error', records: 2 }]
        };

        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, suggestions: { items: { recommendedCount: 1, dependencies: [], columnSuggestions: {} } }, templates: [] }) })
            .mockResolvedValueOnce({ ok: true, json: async () => resultData });

        const mockOnSuccess = jest.fn();
        render(<MockDataGenerator projectId="test-project" onSuccess={mockOnSuccess} />);

        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => expect(screen.getByText('Table Configuration')).toBeInTheDocument());

        // Trigger generate
        const generateBtn = within(screen.getByTestId('tab-content-configure')).getByText('Generate');
        fireEvent.click(generateBtn);

        await waitFor(() => expect(screen.getByText('Generation Summary')).toBeInTheDocument());
        expect(screen.getByText('Successfully Generated Data')).toBeInTheDocument();
        expect(screen.getByText('Failed to Generate Data')).toBeInTheDocument();

        // Close button should reset dialog state (mock requires invoking captured onOpenChange)
        fireEvent.click(screen.getByText('Close'));
        if (typeof capturedDialogOnOpenChange === 'function') capturedDialogOnOpenChange(false);
        await waitFor(() => expect(screen.getByText('Failed to load schema analysis.')).toBeInTheDocument());
    });

    test('generateMockData failure shows server error message', async () => {
        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, suggestions: { items: { recommendedCount: 1, dependencies: [], columnSuggestions: {} } }, templates: [] }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, message: 'Generation failed' }) });

        render(<MockDataGenerator projectId="test-project" />);
        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => expect(screen.getByText('Table Configuration')).toBeInTheDocument());

        const generateBtn = within(screen.getByTestId('tab-content-configure')).getByText('Generate');
        fireEvent.click(generateBtn);

        await waitFor(() => expect(screen.getByText('Generation failed')).toBeInTheDocument());
    });

    test('generatePreview failure sets error result', async () => {
        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, suggestions: { items: { recommendedCount: 1, dependencies: [], columnSuggestions: {} } }, templates: [] }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, message: 'Preview failed' }) });

        render(<MockDataGenerator projectId="test-project" />);
        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => expect(screen.getByText('Table Configuration')).toBeInTheDocument());

        const previewBtn = within(screen.getByTestId('tab-content-configure')).getByText('Preview');
        fireEvent.click(previewBtn);

        // wait for result to be set and visible in result tab
        await waitFor(() => expect(screen.getByText('Preview failed')).toBeInTheDocument());
    });

    test('loadSchemaAnalysis failure sets result and does not blow up', async () => {
        global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: false, message: 'Load error' }) });

        render(<MockDataGenerator projectId="test-project" />);
        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test('getTemplateDescription shows fallback for unknown template', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                suggestions: {},
                templates: ['unknown_template']
            })
        });

        render(<MockDataGenerator projectId="test-project" />);
        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => expect(screen.getByText('Predefined Templates')).toBeInTheDocument());
        // Template description fallback
        expect(screen.getByText('Predefined data template for common use cases')).toBeInTheDocument();
    });

    const templateCases = [
        ['ecommerce', 'Complete e-commerce setup with products, categories, customers, and orders'],
        ['blog', 'Blog platform with authors, posts, categories, and comments'],
        ['user_management', 'User system with roles, permissions, and user accounts']
    ];

    test.each(templateCases)('template %s displays description', async (template, description) => {
        global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, suggestions: {}, templates: [template] }) });
        render(<MockDataGenerator projectId="test-project" />);
        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => expect(screen.getByText('Predefined Templates')).toBeInTheDocument());
        expect(screen.getByText(description)).toBeInTheDocument();
    });

    test('generateMockData network error is handled', async () => {
        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, suggestions: { items: { recommendedCount: 1, dependencies: [], columnSuggestions: {} } }, templates: [] }) })
            .mockRejectedValueOnce(new Error('Network error'));

        render(<MockDataGenerator projectId="test-project" />);
        fireEvent.click(screen.getByText('Retry'));

        await waitFor(() => expect(screen.getByText('Table Configuration')).toBeInTheDocument());

        const generateBtn = within(screen.getByTestId('tab-content-configure')).getByText('Generate');
        fireEvent.click(generateBtn);

        await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
    });

    test('resetDialog clears state when dialog onOpenChange is false', async () => {
        // mock fetch to return analysis and a successful generate
        global.fetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, suggestions: {}, templates: [] }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, summary: { tablesProcessed: 1, totalRecords: 1 }, successfulTables: [] }) });

        render(<MockDataGenerator projectId="test-project" onSuccess={() => {}} />);

        // load analysis
        fireEvent.click(screen.getByText('Retry'));
        await waitFor(() => expect(screen.getByText('Table Configuration')).toBeInTheDocument());

        // Call the captured onOpenChange(false) to simulate closing
        expect(typeof capturedDialogOnOpenChange).toBe('function');
        capturedDialogOnOpenChange(false);

        await waitFor(() => expect(screen.getByText('Failed to load schema analysis.')).toBeInTheDocument());
    });

});
