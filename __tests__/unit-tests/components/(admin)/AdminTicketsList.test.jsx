import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import AdminTicketsList from '@/components/(admin)/AdminTicketsList';
import { showToast } from 'nextjs-toast-notify';

// Mock toast notifications
jest.mock('nextjs-toast-notify', () => ({
  showToast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

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
    // Mock window.alert and window.confirm
    global.alert = jest.fn();
    global.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
      status: 'active',
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

    await waitFor(() => expect(screen.getByText('Test Ticket')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Test Ticket'));

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Note')).toBeInTheDocument();
    });
  });

  test('filters tickets by status', async () => {
    const tickets = [
      { id: 't1', subject: 'ActiveTicket', status: 'active', priority: 'high', category: 'technical', user_name: 'User1', user_email: 'user1@test.com', created_at: '2025-01-01T10:00:00Z', updated_at: '2025-01-01T10:00:00Z', message: 'msg' },
      { id: 't2', subject: 'SolvedTicket', status: 'solved', priority: 'low', category: 'general', user_name: 'User2', user_email: 'user2@test.com', created_at: '2025-01-02T10:00:00Z', updated_at: '2025-01-02T10:00:00Z', message: 'msg2' }
    ];

    global.fetch = jest.fn(async (url) => {
      if (url.includes('status=active')) {
        return { ok: true, json: async () => ({ tickets: [tickets[0]] }) };
      }
      return { ok: true, json: async () => ({ tickets }) };
    });

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText('ActiveTicket')).toBeInTheDocument());

    const statusSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    await waitFor(() => {
      expect(screen.getByText('ActiveTicket')).toBeInTheDocument();
      expect(screen.queryByText('SolvedTicket')).not.toBeInTheDocument();
    });
  });

  test('clears filters when clear button clicked', async () => {
    const ticket = {
      id: 't1',
      subject: 'Test',
      status: 'active',
      priority: 'high',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      message: 'msg'
    };

    let fetchCallCount = 0;
    global.fetch = jest.fn(async () => {
      fetchCallCount++;
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());

    const statusSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    await waitFor(() => expect(fetchCallCount).toBe(2));

    const clearButton = screen.getByText(/Clear Filters|Clear/i);
    fireEvent.click(clearButton);

    await waitFor(() => expect(fetchCallCount).toBe(3));
  });

  test('updates ticket successfully', async () => {
    const ticket = {
      id: 't1',
      subject: 'Update Test',
      status: 'active',
      priority: 'high',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      message: 'msg',
      admin_notes: ''
    };

    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'PUT') {
        return { ok: true };
      }
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText('Update Test')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Update Test'));

    await waitFor(() => {
      const statusSelects = screen.getAllByRole('combobox');
      const ticketStatusSelect = statusSelects.find(select => 
        select.id === 'status' && select.value === 'active'
      );
      expect(ticketStatusSelect).toBeInTheDocument();
    });

    const allButtons = screen.getAllByRole('button');
    const updateButton = allButtons.find(btn => btn.textContent.includes('Update Ticket'));
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(showToast.success).toHaveBeenCalledWith(
        'Ticket updated successfully!',
        expect.any(Object)
      );
    });
  });

  test('handles update failure', async () => {
    const ticket = {
      id: 't1',
      subject: 'Fail Update',
      status: 'active',
      priority: 'high',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      message: 'msg',
      admin_notes: ''
    };

    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'PUT') {
        return { ok: false, json: async () => ({ error: 'Update failed' }) };
      }
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText('Fail Update')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Fail Update'));

    await waitFor(() => {
      const statusSelects = screen.getAllByRole('combobox');
      const ticketStatusSelect = statusSelects.find(select => 
        select.id === 'status' && select.value === 'active'
      );
      expect(ticketStatusSelect).toBeInTheDocument();
    });

    const buttons = screen.getAllByText(/Update Ticket/i);
    const updateButton = buttons[buttons.length - 1]; // Get the last one
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith(
        'Update failed',
        expect.any(Object)
      );
    });
  });

  test('deletes ticket successfully', async () => {
    const ticket = {
      id: 't1',
      subject: 'Delete Test',
      status: 'active',
      priority: 'high',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      message: 'msg'
    };

    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'DELETE') {
        return { ok: true };
      }
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    global.confirm.mockReturnValue(true);

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText('Delete Test')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Delete Test'));

    const deleteButton = screen.getByTestId('icon-trash').closest('button');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(showToast.success).toHaveBeenCalledWith(
        'Ticket deleted successfully',
        expect.any(Object)
      );
    });
  });

  test('cancels delete when user declines confirmation', async () => {
    const ticket = {
      id: 't1',
      subject: 'No Delete',
      status: 'active',
      priority: 'high',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      message: 'msg'
    };

    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets: [ticket] }) }));
    global.confirm.mockReturnValue(false);

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText('No Delete')).toBeInTheDocument());

    fireEvent.click(screen.getByText('No Delete'));

    const deleteButton = screen.getByTestId('icon-trash').closest('button');
    fireEvent.click(deleteButton);

    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/tickets/t1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  test('handles delete failure', async () => {
    const ticket = {
      id: 't1',
      subject: 'Fail Delete',
      status: 'active',
      priority: 'high',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      message: 'msg'
    };

    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'DELETE') {
        return { ok: false, json: async () => ({ error: 'Delete failed' }) };
      }
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    global.confirm.mockReturnValue(true);

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText('Fail Delete')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Fail Delete'));

    const deleteButton = screen.getByTestId('icon-trash').closest('button');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(showToast.error).toHaveBeenCalledWith(
        'Delete failed',
        expect.any(Object)
      );
    });
  });

  test('refreshes ticket list after update', async () => {
    const ticket = {
      id: 't1',
      subject: 'Refresh Test',
      status: 'active',
      priority: 'high',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      message: 'msg',
      admin_notes: ''
    };

    let fetchCount = 0;
    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'PUT') {
        return { ok: true };
      }
      fetchCount++;
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText('Refresh Test')).toBeInTheDocument());
    expect(fetchCount).toBe(1);

    fireEvent.click(screen.getByText('Refresh Test'));

    await waitFor(() => {
      const statusSelects = screen.getAllByRole('combobox');
      const ticketStatusSelect = statusSelects.find(select => 
        select.id === 'status' && select.value === 'active'
      );
      expect(ticketStatusSelect).toBeInTheDocument();
    });

    const buttons = screen.getAllByText(/Update Ticket/i);
    const updateButton = buttons[buttons.length - 1];
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(fetchCount).toBe(2);
    });
  });

  test('clears selected ticket after successful update', async () => {
    const ticket = {
      id: 't1',
      subject: 'Clear Test',
      status: 'active',
      priority: 'high',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      message: 'msg',
      admin_notes: ''
    };

    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'PUT') {
        return { ok: true };
      }
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText('Clear Test')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Clear Test'));

    await waitFor(() => {
      const statusSelects = screen.getAllByRole('combobox');
      const ticketStatusSelect = statusSelects.find(select => 
        select.id === 'status' && select.value === 'active'
      );
      expect(ticketStatusSelect).toBeInTheDocument();
    });

    const buttons = screen.getAllByText(/Update Ticket/i);
    const updateButton = buttons[buttons.length - 1];
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText(/Select a ticket to view details and update/i)).toBeInTheDocument();
    });
  });

  test('clears selected ticket after successful delete when ids match', async () => {
    const ticket = {
      id: 't1',
      subject: 'Delete Clear',
      status: 'active',
      priority: 'high',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      message: 'msg'
    };

    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'DELETE') {
        return { ok: true };
      }
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    global.confirm.mockReturnValue(true);

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText('Delete Clear')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Delete Clear'));

    const deleteButton = screen.getByTestId('icon-trash').closest('button');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/Select a ticket to view details and update/i)).toBeInTheDocument();
    });
  });

  test('handles error during fetch gracefully', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('Network error');
    });

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<AdminTicketsList />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading tickets.../i)).not.toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  test('formats date correctly', async () => {
    const ticket = {
      id: 't1',
      subject: 'Date Test',
      status: 'active',
      priority: 'high',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-15T14:30:00Z',
      updated_at: '2025-01-15T14:30:00Z',
      message: 'msg'
    };

    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets: [ticket] }) }));

    render(<AdminTicketsList />);

    await waitFor(() => {
      expect(screen.getByText('Date Test')).toBeInTheDocument();
      // Check that date is formatted (contains "Jan" or "2025")
      expect(screen.getByText(/Jan|2025/i)).toBeInTheDocument();
    });
  });

  test('displays ticket priority with correct styling', async () => {
    const ticket = {
      id: 't1',
      subject: 'Priority Test',
      status: 'active',
      priority: 'urgent',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      message: 'msg'
    };

    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets: [ticket] }) }));

    render(<AdminTicketsList />);

    await waitFor(() => {
      expect(screen.getByText('Priority Test')).toBeInTheDocument();
      expect(screen.getByText('urgent')).toBeInTheDocument();
    });
  });

  test('displays ticket status with correct icon', async () => {
    const ticket = {
      id: 't1',
      subject: 'Status Test',
      status: 'active',
      priority: 'high',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      message: 'msg'
    };

    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tickets: [ticket] }) }));

    render(<AdminTicketsList />);

    await waitFor(() => {
      expect(screen.getByText('Status Test')).toBeInTheDocument();
      expect(screen.getByTestId('icon-clock')).toBeInTheDocument(); // Active status uses Clock icon
    });
  });

  test('allows updating admin notes', async () => {
    const ticket = {
      id: 't1',
      subject: 'Notes Test',
      status: 'active',
      priority: 'high',
      category: 'technical',
      user_name: 'User',
      user_email: 'user@test.com',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z',
      message: 'msg',
      admin_notes: 'Old notes'
    };

    global.fetch = jest.fn(async (url, opts) => {
      if (opts && opts.method === 'PUT') {
        return { ok: true };
      }
      return { ok: true, json: async () => ({ tickets: [ticket] }) };
    });

    render(<AdminTicketsList />);

    await waitFor(() => expect(screen.getByText('Notes Test')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Notes Test'));

    await waitFor(() => {
      const notesTextarea = screen.getByDisplayValue('Old notes');
      expect(notesTextarea).toBeInTheDocument();
      fireEvent.change(notesTextarea, { target: { value: 'New notes' } });
      expect(notesTextarea.value).toBe('New notes');
    });
  });
});
