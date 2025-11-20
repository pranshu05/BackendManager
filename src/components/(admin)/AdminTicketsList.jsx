"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
    Ticket, 
    AlertCircle, 
    CheckCircle, 
    Clock, 
    XCircle,
    Mail,
    User,
    Calendar,
    Filter,
    X,
    Save,
    Trash2,
    RefreshCw,
    Eye
} from 'lucide-react';

const AdminTicketsList = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        category: ''
    });

    // Form state for updating ticket
    const [updateForm, setUpdateForm] = useState({
        status: '',
        priority: '',
        admin_notes: ''
    });

    const statusConfig = {
        active: { label: 'Active', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        inactive: { label: 'Inactive', icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-500/10' },
        solved: { label: 'Solved', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
        in_progress: { label: 'In Progress', icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' }
    };

    const priorityColors = {
        urgent: 'text-red-500 bg-red-500/10',
        high: 'text-orange-500 bg-orange-500/10',
        medium: 'text-yellow-500 bg-yellow-500/10',
        low: 'text-blue-500 bg-blue-500/10'
    };

    useEffect(() => {
        fetchTickets();
    }, [filters]);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.category) params.append('category', filters.category);

            const res = await fetch(`/api/admin/tickets?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectTicket = async (ticket) => {
        setSelectedTicket(ticket);
        setUpdateForm({
            status: ticket.status,
            priority: ticket.priority,
            admin_notes: ticket.admin_notes || ''
        });
    };

    const handleUpdateTicket = async () => {
        if (!selectedTicket) return;

        try {
            setUpdating(true);
            const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateForm)
            });

            if (res.ok) {
                alert('Ticket updated successfully!');
                setSelectedTicket(null);
                fetchTickets(); // Refresh list
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update ticket');
            }
        } catch (error) {
            console.error('Error updating ticket:', error);
            alert('An error occurred while updating the ticket');
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteTicket = async (ticketId) => {
        if (!confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/tickets/${ticketId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('Ticket deleted successfully');
                if (selectedTicket?.id === ticketId) {
                    setSelectedTicket(null);
                }
                fetchTickets(); // Refresh list
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete ticket');
            }
        } catch (error) {
            console.error('Error deleting ticket:', error);
            alert('An error occurred while deleting the ticket');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const clearFilters = () => {
        setFilters({ status: '', priority: '', category: '' });
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filters
                        </CardTitle>
                        <div className="flex gap-2">
                            {(filters.status || filters.priority || filters.category) && (
                                <Button variant="outline" size="sm" onClick={clearFilters} className="cursor-pointer">
                                    <X className="w-4 h-4 mr-2" />
                                    Clear
                                </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={fetchTickets} className="cursor-pointer">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label>Status</Label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md mt-1"
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="in_progress">In Progress</option>
                                <option value="inactive">Inactive</option>
                                <option value="solved">Solved</option>
                            </select>
                        </div>
                        <div>
                            <Label>Priority</Label>
                            <select
                                value={filters.priority}
                                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md mt-1"
                            >
                                <option value="">All Priorities</option>
                                <option value="urgent">Urgent</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                        <div>
                            <Label>Category</Label>
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md mt-1"
                            >
                                <option value="">All Categories</option>
                                <option value="general">General</option>
                                <option value="technical">Technical</option>
                                <option value="billing">Billing</option>
                                <option value="feature_request">Feature Request</option>
                                <option value="bug_report">Bug Report</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tickets List */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Ticket className="w-5 h-5" />
                            Support Tickets ({tickets.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">
                                Loading tickets...
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No tickets found
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {tickets.map((ticket) => {
                                    const StatusIcon = statusConfig[ticket.status]?.icon || Clock;
                                    const statusInfo = statusConfig[ticket.status] || statusConfig.active;

                                    return (
                                        <div
                                            key={ticket.id}
                                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                                selectedTicket?.id === ticket.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'hover:bg-muted/30'
                                            }`}
                                            onClick={() => handleSelectTicket(ticket)}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`p-1.5 rounded ${statusInfo.bg}`}>
                                                            <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                                                        </div>
                                                        <h3 className="font-semibold text-sm truncate">
                                                            {ticket.subject}
                                                        </h3>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[ticket.priority]}`}>
                                                            {ticket.priority}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                                                            {ticket.category.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {ticket.user_name} ({ticket.user_email})
                                                    </p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(ticket.created_at)}
                                                    </p>
                                                </div>
                                                <Eye className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Ticket Details & Update Form */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Ticket Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!selectedTicket ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Select a ticket to view details and update</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* User Info */}
                                <div className="p-4 bg-muted/50 rounded-lg">
                                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        User Information
                                    </h4>
                                    <div className="space-y-1 text-sm">
                                        <p><strong>Name:</strong> {selectedTicket.user_name}</p>
                                        <p className="flex items-center gap-2">
                                            <strong>Email:</strong> 
                                            <a 
                                                href={`mailto:${selectedTicket.user_email}`}
                                                className="text-primary hover:underline flex items-center gap-1"
                                            >
                                                <Mail className="w-3 h-3" />
                                                {selectedTicket.user_email}
                                            </a>
                                        </p>
                                        {selectedTicket.user_phone && (
                                            <p><strong>Phone:</strong> {selectedTicket.user_phone}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Ticket Info */}
                                <div>
                                    <h4 className="font-semibold mb-2">Subject</h4>
                                    <p className="text-sm">{selectedTicket.subject}</p>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-2">Message</h4>
                                    <div className="p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                                        {selectedTicket.message}
                                    </div>
                                </div>

                                {/* Update Form */}
                                <div className="border-t pt-4 space-y-4">
                                    <h4 className="font-semibold">Update Ticket</h4>

                                    <div>
                                        <Label htmlFor="status">Status</Label>
                                        <select
                                            id="status"
                                            value={updateForm.status}
                                            onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-md mt-1"
                                        >
                                            <option value="active">Active</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="solved">Solved</option>
                                        </select>
                                    </div>

                                    <div>
                                        <Label htmlFor="priority">Priority</Label>
                                        <select
                                            id="priority"
                                            value={updateForm.priority}
                                            onChange={(e) => setUpdateForm({ ...updateForm, priority: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-md mt-1"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>

                                    <div>
                                        <Label htmlFor="admin_notes">Admin Notes</Label>
                                        <Textarea
                                            id="admin_notes"
                                            value={updateForm.admin_notes}
                                            onChange={(e) => setUpdateForm({ ...updateForm, admin_notes: e.target.value })}
                                            rows={6}
                                            placeholder="Add notes that will be visible to the user..."
                                            className="mt-1"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleUpdateTicket}
                                            disabled={updating}
                                            className="flex-1 cursor-pointer"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            {updating ? 'Updating...' : 'Update Ticket'}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleDeleteTicket(selectedTicket.id)}
                                            disabled={updating}
                                            className="cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Metadata */}
                                <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
                                    <p><strong>Created:</strong> {formatDate(selectedTicket.created_at)}</p>
                                    <p><strong>Updated:</strong> {formatDate(selectedTicket.updated_at)}</p>
                                    {selectedTicket.resolved_at && (
                                        <p><strong>Resolved:</strong> {formatDate(selectedTicket.resolved_at)}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminTicketsList;