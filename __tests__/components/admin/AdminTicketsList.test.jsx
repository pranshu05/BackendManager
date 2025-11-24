import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import AdminTicketsList from '@/components/(admin)/AdminTicketsList';

// Mock UI card and controls to simplify DOM
jest.mock('@/components/ui/card', () => ({
  Card: ({ children }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }) => <div data-testid="card-title">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, ...props }) => <label htmlFor={htmlFor} {...props}>{children}</label>
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ children, ...props }) => <textarea {...props}>{children}</textarea>
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Ticket: () => <div data-testid="icon-ticket" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
  CheckCircle: () => <div data-testid="icon-check" />,
  Clock: () => <div data-testid="icon-clock" />,
  XCircle: () => <div data-testid="icon-x" />,
  Mail: () => <div data-testid="icon-mail" />,
  User: () => <div data-testid="icon-user" />,
  Calendar: () => <div data-testid="icon-calendar" />,
  Filter: () => <div data-testid="icon-filter" />,
  X: () => <div data-testid="icon-x2" />,
  Save: () => <div data-testid="icon-save" />,
  Trash2: () => <div data-testid="icon-trash" />,
  RefreshCw: () => <div data-testid="icon-refresh" />,
  Eye: () => <div data-testid="icon-eye" />,
}));

describe('AdminTicketsList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset confirm and alert
    jest.spyOn(window, 'alert').mockImplementation(() => {});
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    window.alert.mockRestore();
    window.confirm.mockRestore();
  });

  test('shows loading state while fetching', async () => {
    let resolveFetch;
    global.fetch = jest.fn(() => new Promise((r) => { resolveFetch = r; }));

    render(<AdminTicketsList />);

    expect(screen.getByText(/Loading tickets.../i)).toBeInTheDocument();

    // resolve
    const payload = { tickets: [] };
    await act(async () => resolveFetch({ ok: true, json: async () => payload }));

    await waitFor(() => expect(screen.queryByText(/Loading tickets.../i)).not.toBeInTheDocument());
  });

  test('displays no tickets message', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets: [] }) }));

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText(/No tickets found/i)).toBeInTheDocument());
  });

  test('renders ticket list and details on select', async () => {
    const ticket = {
      id: 't1',
      subject: 'Test Ticket',
      status: 'unknown_status',
      priority: 'urgent',
      category: 'technical',
      user_name: 'Tester',
      user_email: 'tester@example.com',
      user_phone: '1234567890',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-02T10:00:00Z',
      message: 'Hello',
      admin_notes: 'Note'
    };

    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets: [ticket] }) }));

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText(/Support Tickets/i)).toBeInTheDocument());

    // Ticket should appear
    await screen.findByText(/Test Ticket/i);

    // Click to select
    fireEvent.click(screen.getByText(/Test Ticket/i));

    // Details show
    expect(screen.getByText(/User Information/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/Tester/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/tester@example.com/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/1234567890/i)).length).toBeGreaterThan(0);

    // formatDate branch shows created/updated text
    expect(screen.getByText(/Created:/i)).toBeInTheDocument();
    expect(screen.getByText(/Updated:/i)).toBeInTheDocument();

    // Status fallback should render Clock icon (unknown status -> default active)
    expect(screen.queryByTestId('icon-clock')).toBeInTheDocument();
  });

  test('handles update success and failure', async () => {
    const ticket = {
      id: 't2',
      subject: 'Ticket Update',
      status: 'active',
      priority: 'low',
      category: 'general',
      user_name: 'User',
      user_email: 'user@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message: 'msg',
      admin_notes: ''
    };

    // first fetch returns the ticket
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets: [ticket] }) }));

    render(<AdminTicketsList />);

    // wait and select
    await waitFor(() => expect(screen.getByText('Ticket Update')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Ticket Update'));

    // Mock PUT to succeed
    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'PUT') return { ok: true };
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    // Change status and click Update
    fireEvent.change(screen.getByLabelText(/Status/i), { target: { value: 'solved' } });
    const detailsCard = screen.getByText(/Ticket Details/i).closest('[data-testid="card"]');
    const updateBtnInDetails = Array.from(detailsCard.querySelectorAll('button')).find((b) => b.textContent.includes('Update Ticket'));
    fireEvent.click(updateBtnInDetails);

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Ticket updated successfully!'));

    // Now mock PUT to fail
    window.alert.mockClear();
    // reselect the ticket because update cleared selection on success
    fireEvent.click(screen.getByText('Ticket Update'));
    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'PUT') return { ok: false, json: async () => ({ error: 'bad' }) };
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    const updateBtnInDetails2 = Array.from(detailsCard.querySelectorAll('button')).find((b) => b.textContent.includes('Update Ticket'));
    fireEvent.click(updateBtnInDetails2);
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('bad'));
  });

  test('delete ticket confirm and success flow', async () => {
    const ticket = { id: 't3', subject: 'Del Ticket', status: 'solved', priority: 'low', category: 'general', user_name: 'X', user_email: 'x@x.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message: '', admin_notes: '' };

    // initial load
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets: [ticket] }) }));

    render(<AdminTicketsList />);
    await waitFor(() => expect(screen.getByText('Del Ticket')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Del Ticket'));

    // set confirm = false to avoid calling delete
    window.confirm.mockImplementation(() => false);
    const deleteBtn = screen.getByTestId('icon-trash').closest('button');
    fireEvent.click(deleteBtn);
    expect(window.confirm).toHaveBeenCalled();

    // set confirm true and mock delete
    window.confirm.mockImplementation(() => true);
    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'DELETE') return { ok: true };
      return { ok: true, json: async () => ({ tickets: [] }) };
    });

    fireEvent.click(deleteBtn);
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Ticket deleted successfully'));
    // After deletion the details should be cleared
    expect(screen.getByText(/Select a ticket to view details and update/i)).toBeInTheDocument();
  });

  test('filters change triggers fetch with query params and clear filters works', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets: [] }) }));

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText(/Filters/i)).toBeInTheDocument());

    // set status filter
    const statusSelect = screen.getByText('Status').closest('div').querySelector('select');
    fireEvent.change(statusSelect, { target: { value: 'active' } });
    // fetch should be called for new params
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('?status=active'));

    // set priority filter
    const prioritySelect = screen.getByText('Priority').closest('div').querySelector('select');
    fireEvent.change(prioritySelect, { target: { value: 'urgent' } });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('priority=urgent'));

    // clear filters (Clear should be visible when filters set)
    expect(screen.getByText('Clear')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear'));
    expect(global.fetch).toHaveBeenCalled();
  });

  test('fetchTickets network error shows no tickets', async () => {
    global.fetch = jest.fn(() => { throw new Error('boom'); });

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText(/No tickets found/i)).toBeInTheDocument());
  });

  test('update ticket network error shows alert', async () => {
    const ticket = {
      id: 't4',
      subject: 'Update Fail',
      status: 'active',
      priority: 'low',
      category: 'general',
      user_name: 'Z',
      user_email: 'z@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message: '',
    };

    // initial fetch
    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'PUT') throw new Error('put fail');
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    render(<AdminTicketsList />);
    await waitFor(() => expect(screen.getByText('Update Fail')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Update Fail'));

    // click update without changing anything
    const detailsCard = screen.getByText(/Ticket Details/i).closest('[data-testid="card"]');
    const updateBtn = Array.from(detailsCard.querySelectorAll('button')).find((b) => b.textContent.includes('Update Ticket'));

    fireEvent.click(updateBtn);

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('An error occurred while updating the ticket'));
  });

  test('delete returns error and shows provided message', async () => {
    const ticket = { id: 't5', subject: 'DelFail', status: 'solved', priority: 'low', category: 'general', user_name: 'D', user_email: 'd@d.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message: '' };

    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'DELETE') return { ok: false, json: async () => ({ error: 'delete failed' }) };
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    render(<AdminTicketsList />);
    await waitFor(() => expect(screen.getByText('DelFail')).toBeInTheDocument());
    fireEvent.click(screen.getByText('DelFail'));

    const deleteBtn = screen.getByTestId('icon-trash').closest('button');
    fireEvent.click(deleteBtn);

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('delete failed'));
  });

  test('delete throw error shows fallback alert', async () => {
    const ticket = { id: 't6', subject: 'DelThrow', status: 'solved', priority: 'low', category: 'general', user_name: 'E', user_email: 'e@e.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message: '' };

    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'DELETE') throw new Error('boom');
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    render(<AdminTicketsList />);
    await waitFor(() => expect(screen.getByText('DelThrow')).toBeInTheDocument());
    fireEvent.click(screen.getByText('DelThrow'));

    const deleteBtn = screen.getByTestId('icon-trash').closest('button');
    fireEvent.click(deleteBtn);

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('An error occurred while deleting the ticket'));
  });

  test('update includes admin notes and priority in request body', async () => {
    const ticket = {
      id: 't7',
      subject: 'Check Body',
      status: 'active',
      priority: 'low',
      category: 'general',
      user_name: 'G',
      user_email: 'g@g.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message: ''
    };

    let putCallBody = null;
    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'PUT') {
        putCallBody = JSON.parse(opts.body);
        return { ok: true };
      }
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    render(<AdminTicketsList />);
    await waitFor(() => expect(screen.getByText('Check Body')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Check Body'));

    // change priority and notes
    fireEvent.change(screen.getByLabelText(/Priority/i), { target: { value: 'urgent' } });
    fireEvent.change(screen.getByLabelText(/Admin Notes/i), { target: { value: 'note body' } });

    const detailsCard = screen.getByText(/Ticket Details/i).closest('[data-testid="card"]');
    const updateBtn = Array.from(detailsCard.querySelectorAll('button')).find((b) => b.textContent.includes('Update Ticket'));
    fireEvent.click(updateBtn);

    await waitFor(() => expect(putCallBody).not.toBeNull());
    expect(putCallBody.priority).toBe('urgent');
    expect(putCallBody.admin_notes).toBe('note body');
  });

  test('refresh button triggers fetchTickets', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets: [] }) }));

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText(/Filters/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Refresh/i));

    expect(global.fetch).toHaveBeenCalled();
  });

  test('category filter triggers query param', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets: [] }) }));

    render(<AdminTicketsList />);
    await waitFor(() => expect(screen.getByText(/Filters/i)).toBeInTheDocument());

    const categorySelect = screen.getByText('Category').closest('div').querySelector('select');
    fireEvent.change(categorySelect, { target: { value: 'technical' } });
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('category=technical'));
  });

  test('fetchTickets handles server not-ok responses', async () => {
    // Server returns not-ok (no json)
    global.fetch = jest.fn(async () => ({ ok: false }));

    render(<AdminTicketsList />);

    // Component should still render and show no tickets
    await waitFor(() => expect(screen.getByText(/No tickets found/i)).toBeInTheDocument());
  });

  test('force update button returns early when no selection', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets: [] }) }));

    render(<AdminTicketsList />);

    // There should be no Update button visible when no ticket is selected
    expect(screen.queryByText(/Update Ticket/i)).not.toBeInTheDocument();
  });

  test('force update catch logs and alerts on network error', async () => {
    // Mock put to throw and return a ticket on GET
    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'PUT') throw new Error('forced-upd');
      return { ok: true, json: async () => ({ tickets: [
        { id: 'err-put', subject: 'Err Update', status: 'active', priority: 'low', category: 'general', user_name: 'U', user_email: 'u@u.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message: '' }
      ] }) };
    });

    render(<AdminTicketsList />);
    // simulate initial fetch returning a ticket
    // select a ticket by text and click Update to exercise error path
    await waitFor(() => expect(screen.getByText(/Filters/i)).toBeInTheDocument());
    // Click the subject to open details and click Update to cause the PUT error
    await waitFor(() => expect(screen.getByText('Err Update')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Err Update'));

    const detailsCard = screen.getByText(/Ticket Details/i).closest('[data-testid="card"]');
    const updateBtn = Array.from(detailsCard.querySelectorAll('button')).find((b) => b.textContent.includes('Update Ticket'));

    fireEvent.click(updateBtn);
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('An error occurred while updating the ticket'), { timeout: 2000 });
  });

  test('force delete catch logs and alerts when delete throws', async () => {
    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'DELETE') throw new Error('forced-del');
      return { ok: true, json: async () => ({ tickets: [] }) };
    });

    render(<AdminTicketsList />);
    // window.confirm should be true for delete
    window.confirm.mockImplementation(() => true);

    // Rerender with a ticket where delete throws
    const ticket2 = { id: 'forced-del', subject: 'DelThrower', status: 'solved', priority: 'low', category: 'general', user_name: 'E', user_email: 'e@e.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message: '' };
    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'DELETE') throw new Error('forced-del');
      return { ok: true, json: async () => ({ tickets: [ticket2] }) };
    });

    // Re-render to fetch the new ticket
    render(<AdminTicketsList />);
    await waitFor(() => expect(screen.getByText('DelThrower')).toBeInTheDocument());
    fireEvent.click(screen.getByText('DelThrower'));
    const deleteBtn = screen.getByTestId('icon-trash').closest('button');
    fireEvent.click(deleteBtn);

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('An error occurred while deleting the ticket'));
  });

  test('shows correct icons for known statuses and shows resolved date', async () => {
    const tickets = [
      { id: 's1', subject: 'Active', status: 'active', priority: 'low', category: 'general', user_name: 'A', user_email: 'a@a.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message: '' },
      { id: 's2', subject: 'Inactive', status: 'inactive', priority: 'low', category: 'general', user_name: 'B', user_email: 'b@b.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message: '' },
      { id: 's3', subject: 'Solved', status: 'solved', priority: 'low', category: 'general', user_name: 'C', user_email: 'c@c.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message: '', resolved_at: new Date().toISOString() },
      { id: 's4', subject: 'Progress', status: 'in_progress', priority: 'low', category: 'general', user_name: 'D', user_email: 'd@d.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message: '' }
    ];

    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets }) }));

    render(<AdminTicketsList />);

    // wait for list
    await screen.findByTestId('icon-clock');

    // Icons should be present for known statuses
    expect(screen.getByTestId('icon-clock')).toBeTruthy(); // active
    expect(screen.getByTestId('icon-x')).toBeTruthy(); // inactive
    expect(screen.getByTestId('icon-check')).toBeTruthy(); // solved
    expect(screen.getByTestId('icon-alert')).toBeTruthy(); // in_progress

    // Click solved to show resolved text — use explicit test id for the row for deterministic click
    // find the row by subject text and click
    // Use heading role to avoid matching option text in select
    const solvedHeading = screen.getByRole('heading', { name: /Solved/i });
    await act(async () => {
      fireEvent.click(solvedHeading);
    });
    await waitFor(() => expect(screen.getByText(/Resolved:/i)).toBeInTheDocument());
  });

  test('update returns default failed message when server returns no error', async () => {
    const ticket = { id: 'tf', subject: 'DefaultFail', status: 'active', priority: 'low', category: 'general', user_name: 'F', user_email: 'f@f.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message: '' };

    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'PUT') return { ok: false, json: async () => ({}) };
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    render(<AdminTicketsList />);
    await waitFor(() => expect(screen.getByText('DefaultFail')).toBeInTheDocument());
    fireEvent.click(screen.getByText('DefaultFail'));

    const updateBtn = Array.from(screen.getByText(/Ticket Details/i).closest('[data-testid="card"]').querySelectorAll('button')).find(b => b.textContent.includes('Update Ticket'));
    fireEvent.click(updateBtn);

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Failed to update ticket'));
  });

  test('delete success clears selectedTicket when ids match', async () => {
    const ticket = { id: 'force-delete', subject: 'MatchDelete', status: 'solved', priority: 'low', category: 'general', user_name: 'D', user_email: 'd@d.com', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), message: '' };

    // initial fetch
    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'DELETE') return { ok: true };
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    render(<AdminTicketsList />);
    await waitFor(() => expect(screen.getByText('MatchDelete')).toBeInTheDocument());
    fireEvent.click(screen.getByText('MatchDelete'));

    // confirm true
    window.confirm.mockImplementation(() => true);

    // click the visible delete button
    const deleteBtn = screen.getByTestId('icon-trash').closest('button');
    fireEvent.click(deleteBtn);

    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Ticket deleted successfully'));
    // details cleared
    expect(screen.getByText(/Select a ticket to view details and update/i)).toBeInTheDocument();
  });
});
