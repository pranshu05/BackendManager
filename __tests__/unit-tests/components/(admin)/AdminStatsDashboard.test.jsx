import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import AdminStatsDashboard from '@/components/(admin)/AdminStatsDashboard';

// Mock UI card to simplify DOM
jest.mock('@/components/ui/card', () => ({
    Card: ({ children }) => <div data-testid="card">{children}</div>,
    CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
    CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
    CardTitle: ({ children }) => <div data-testid="card-title">{children}</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
    Ticket: ({}) => <div data-testid="icon-ticket" />,
    AlertCircle: ({}) => <div data-testid="icon-alert" />,
    CheckCircle: ({}) => <div data-testid="icon-check" />,
    Clock: ({}) => <div data-testid="icon-clock" />,
    TrendingUp: ({}) => <div data-testid="icon-trend" />,
    Users: ({}) => <div data-testid="icon-users" />,
    Activity: ({}) => <div data-testid="icon-activity" />,
}));

describe('AdminStatsDashboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('shows loading state while fetching', async () => {
        // Setup fetch that resolves later
        let resolveFetch;
        global.fetch = jest.fn(() => new Promise(resolve => { resolveFetch = resolve; }));

        render(<AdminStatsDashboard />);

        expect(screen.getByText(/Loading statistics.../i)).toBeInTheDocument();

        // resolve with valid data
        const sample = {
            totals: { total_tickets: 1, active_tickets: 0, solved_tickets: 0, high_priority_tickets: 0 },
            statusBreakdown: {},
            priorityBreakdown: {},
            categoryBreakdown: {},
            recentTickets: [],
            averageResolutionHours: '0',
            topUsers: []
        };

        await act(async () => {
            resolveFetch({ ok: true, json: async () => ({ stats: sample }) });
        });

        await waitFor(() => expect(screen.queryByText(/Loading statistics.../i)).not.toBeInTheDocument());
    });

    test('displays stats after successful fetch', async () => {
        const sample = {
            totals: { total_tickets: 100, active_tickets: 10, solved_tickets: 70, high_priority_tickets: 5 },
            statusBreakdown: { open: 20, closed: 80 },
            priorityBreakdown: { urgent: 5, high: 10, medium: 30, low: 55 },
            categoryBreakdown: { billing: 10, technical: 40, account: 50 },
            recentTickets: [ { date: '2025-11-21', count: 5 }, { date: '2025-11-20', count: 10 } ],
            averageResolutionHours: '4.567',
            topUsers: [ { name: 'Alice', email: 'alice@example.com', ticket_count: 4 } ]
        };

        global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ stats: sample }) }));

        render(<AdminStatsDashboard />);

        await waitFor(() => expect(screen.getByText(/Total Tickets/i)).toBeInTheDocument());

        // Check totals
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('70')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();

        // Status Breakdown
        expect(screen.getByText(/open/i)).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();

        // Priority percentages present (use allByText to avoid ambiguity)
        expect(screen.getAllByText(/5.0%/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/55.0%/).length).toBeGreaterThan(0);

        // Category slicing and percentage
        expect(screen.getByText(/technical/i)).toBeInTheDocument();
        expect(screen.getByText(/account/i)).toBeInTheDocument();

        // Recent tickets mapping (there will be multiple rows)
        expect(screen.getAllByText(/tickets/).length).toBeGreaterThan(0);

        // Performance metrics
        expect(screen.getByText('4.6')).toBeInTheDocument(); // averageResolutionHours -> 4.6
        // resolution rate 70/100 = 70.0
        expect(screen.getByText(/70.0/)).toBeInTheDocument();

        // Top users
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });

    test('shows unable to load on fetch failure', async () => {
        global.fetch = jest.fn(async () => ({ ok: false }));

        render(<AdminStatsDashboard />);

        await waitFor(() => expect(screen.getByText(/Unable to load statistics/i)).toBeInTheDocument());
    });

    test('handles empty recentTickets', async () => {
        const sample = {
            totals: { total_tickets: 0, active_tickets: 0, solved_tickets: 0, high_priority_tickets: 0 },
            statusBreakdown: {},
            priorityBreakdown: {},
            categoryBreakdown: {},
            recentTickets: [],
            averageResolutionHours: '0',
            topUsers: []
        };

        global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ stats: sample }) }));

        render(<AdminStatsDashboard />);

        await waitFor(() => expect(screen.getByText(/No tickets created in the last 7 days/i)).toBeInTheDocument());
    });

    test('handles zero totals and missing totals gracefully', async () => {
        const sample = {
            totals: {},
            statusBreakdown: { in_progress: 0 },
            priorityBreakdown: {},
            categoryBreakdown: {},
            recentTickets: [],
            averageResolutionHours: '0',
            topUsers: []
        };

        global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ stats: sample }) }));

        render(<AdminStatsDashboard />);

        // Totals default to 0 (there will be multiple zeros; ensure at least one)
        await waitFor(() => expect(screen.getAllByText('0').length).toBeGreaterThan(0));

        // Resolution rate should show 0 (no tickets)
        expect(screen.getAllByText(/0/).length).toBeGreaterThan(0);
    });

    test('category distribution limited to 6 items', async () => {
        const categories = {};
        for (let i = 1; i <= 8; i++) categories[`cat_${i}`] = i;

        const sample = {
            totals: { total_tickets: 10, active_tickets: 2, solved_tickets: 5, high_priority_tickets: 1 },
            statusBreakdown: {},
            priorityBreakdown: {},
            categoryBreakdown: categories,
            recentTickets: [],
            averageResolutionHours: '1',
            topUsers: []
        };

        global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ stats: sample }) }));

        render(<AdminStatsDashboard />);

        await waitFor(() => expect(screen.getByText(/Category Distribution/i)).toBeInTheDocument());

        // only first 6 categories should appear
        for (let i = 1; i <= 6; i++) {
            const label = `cat_${i}`.replace('_', ' ');
            expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
        }

        // cat_7 and cat_8 should not be in the document
        expect(screen.queryByText(/cat_7/)).not.toBeInTheDocument();
        expect(screen.queryByText(/cat_8/)).not.toBeInTheDocument();
    });

    test('fetch throwing an error shows unable to load', async () => {
        global.fetch = jest.fn(async () => { throw new Error('network fail'); });

        render(<AdminStatsDashboard />);

        await waitFor(() => expect(screen.getByText(/Unable to load statistics/i)).toBeInTheDocument());
    });

    test('priority and category percentage bars set style width correctly', async () => {
        const sample = {
            totals: { total_tickets: 2, active_tickets: 0, solved_tickets: 1, high_priority_tickets: 0 },
            statusBreakdown: {},
            priorityBreakdown: { urgent: 1, high: 1 },
            categoryBreakdown: { billing: 2, technical: 0 },
            recentTickets: [],
            averageResolutionHours: '0',
            topUsers: []
        };

        global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ stats: sample }) }));

        render(<AdminStatsDashboard />);

        // Wait for priority section to appear
        await waitFor(() => expect(screen.getByText(/Priority Distribution/i)).toBeInTheDocument());

        // Priority: urgent is 1 of 2 => 50%
        const urgentLabel = screen.getByText(/^urgent$/i);
        const urgentRoot = urgentLabel.closest('div');
        // the progress bar is in the sibling of the parent container
        const urgentBar = urgentRoot.parentElement.querySelector('div[style]');
        expect(urgentBar).toBeTruthy();
        expect(urgentBar.style.width).toBe('50%');

        // Category: billing is 2 of 2 => 100%
        const billingLabel = screen.getByText(/billing/i);
        const billingRoot = billingLabel.closest('div');
        const billingBar = billingRoot.parentElement.querySelector('div[style]');
        expect(billingBar.style.width).toBe('100%');
    });

    test('priority and category percentage bars show 0% when totals are zero', async () => {
        const sample = {
            totals: { total_tickets: 0, active_tickets: 0, solved_tickets: 0, high_priority_tickets: 0 },
            statusBreakdown: {},
            priorityBreakdown: { urgent: 0, high: 0 },
            categoryBreakdown: { billing: 0, technical: 0 },
            recentTickets: [],
            averageResolutionHours: '0',
            topUsers: []
        };

        global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ stats: sample }) }));

        render(<AdminStatsDashboard />);

        await waitFor(() => expect(screen.getByText(/Priority Distribution/i)).toBeInTheDocument());

        // Priority should display 0% (or 0.0% depending on branch)
        expect(screen.getAllByText(/0(\.0)?%/).length).toBeGreaterThan(0);

        // Progress bars should have style width 0%
        const urgentLabel = screen.getByText(/^urgent$/i);
        const urgentRoot = urgentLabel.closest('div');
        const urgentBar = urgentRoot.parentElement.querySelector('div[style]');
        expect(urgentBar.style.width).toBe('0%');
    });

    test('shows top users limited to 5 and active users count displays', async () => {
        const users = [];
        for (let i = 1; i <= 7; i++) {
            users.push({ name: `User ${i}`, email: `user${i}@example.com`, ticket_count: i });
        }

        const sample = {
            totals: { total_tickets: 10, active_tickets: 2, solved_tickets: 5, high_priority_tickets: 1 },
            statusBreakdown: {},
            priorityBreakdown: {},
            categoryBreakdown: {},
            recentTickets: [],
            averageResolutionHours: '1',
            topUsers: users
        };

        global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ stats: sample }) }));

        render(<AdminStatsDashboard />);

        await waitFor(() => expect(screen.getByText(/Top Users by Ticket Count/i)).toBeInTheDocument());

        // Active users element should show 7 users
        expect(screen.getByText('7')).toBeInTheDocument();

        // Only first 5 users should be rendered
        for (let i = 1; i <= 5; i++) {
            expect(screen.getByText(`User ${i}`)).toBeInTheDocument();
            expect(screen.getByText(`user${i}@example.com`)).toBeInTheDocument();
        }

        // Ensure user 6 and 7 are not showing
        expect(screen.queryByText('User 6')).not.toBeInTheDocument();
        expect(screen.queryByText('User 7')).not.toBeInTheDocument();
    });
});
