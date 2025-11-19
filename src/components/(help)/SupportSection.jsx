"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Ticket,
    Plus,
    Trash2,
    AlertCircle,
    CheckCircle,
    Clock,
    XCircle,
    MessageSquare
} from 'lucide-react';

const SupportSection = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        subject: '',
        message: '',
        category: 'general',
        priority: 'medium'
    });

    const categories = [
        { value: 'general', label: 'General Inquiry' },
        { value: 'technical', label: 'Technical Issue' },
        { value: 'billing', label: 'Billing' },
        { value: 'feature_request', label: 'Feature Request' },
        { value: 'bug_report', label: 'Bug Report' },
        { value: 'other', label: 'Other' }
    ];

    const priorities = [
        { value: 'low', label: 'Low', color: 'text-blue-500' },
        { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
        { value: 'high', label: 'High', color: 'text-orange-500' },
        { value: 'urgent', label: 'Urgent', color: 'text-red-500' }
    ];

    const statusConfig = {
        active: { label: 'Active', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        inactive: { label: 'Inactive', icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-500/10' },
        solved: { label: 'Solved', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
        in_progress: { label: 'In Progress', icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/support');
            if (res.ok) {
                const data = await res.json();
                setTickets(data.tickets || []);
            } else {
                console.error('Failed to fetch tickets');
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.subject.trim() || !formData.message.trim()) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert('Support ticket created successfully!');
                setFormData({
                    subject: '',
                    message: '',
                    category: 'general',
                    priority: 'medium'
                });
                setShowCreateForm(false);
                fetchTickets(); // Refresh the list
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create support ticket');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            alert('An error occurred while creating the ticket');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (ticketId) => {
        if (!confirm('Are you sure you want to delete this ticket?')) {
            return;
        }

        try {
            const res = await fetch(`/api/support/${ticketId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('Ticket deleted successfully');
                fetchTickets(); // Refresh the list
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
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Create Ticket Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="w-6 h-6 text-primary" />
                                Support Tickets
                            </CardTitle>
                            <CardDescription>
                                Raise a support ticket and our team will get back to you via email
                            </CardDescription>
                        </div>
                        <Button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Ticket
                        </Button>
                    </div>
                </CardHeader>

                {showCreateForm && (
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <select
                                        id="category"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority</Label>
                                    <select
                                        id="priority"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        {priorities.map(pri => (
                                            <option key={pri.value} value={pri.value}>
                                                {pri.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject *</Label>
                                <Input
                                    id="subject"
                                    type="text"
                                    placeholder="Brief description of your issue"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    maxLength={255}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="message">Message *</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Provide detailed information about your issue or question"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    rows={6}
                                    required
                                />
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowCreateForm(false)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                )}
            </Card>

            {/* Tickets List */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Ticket className="w-5 h-5" />
                        Your Tickets ({tickets.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading tickets...
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No support tickets yet</p>
                            <p className="text-sm">Create a new ticket to get help from our support team</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tickets.map((ticket) => {
                                const StatusIcon = statusConfig[ticket.status]?.icon || Clock;
                                const statusInfo = statusConfig[ticket.status] || statusConfig.active;
                                const priorityInfo = priorities.find(p => p.value === ticket.priority);

                                return (
                                    <div
                                        key={ticket.id}
                                        className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg ${statusInfo.bg}`}>
                                                        <StatusIcon className={`w-5 h-5 ${statusInfo.color}`} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold text-foreground">
                                                            {ticket.subject}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                            {ticket.message}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    <span className={`px-2 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color} font-medium`}>
                                                        {statusInfo.label}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded-full bg-muted ${priorityInfo?.color || ''}`}>
                                                        Priority: {priorityInfo?.label || ticket.priority}
                                                    </span>
                                                    <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                                        {categories.find(c => c.value === ticket.category)?.label || ticket.category}
                                                    </span>
                                                    <span className="px-2 py-1 text-muted-foreground">
                                                        Created: {formatDate(ticket.created_at)}
                                                    </span>
                                                </div>

                                                {ticket.admin_notes && (
                                                    <div className="mt-2 p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
                                                        <p className="text-sm font-medium text-foreground mb-1">Admin Notes:</p>
                                                        <p className="text-sm text-muted-foreground">{ticket.admin_notes}</p>
                                                    </div>
                                                )}

                                                {ticket.resolved_at && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Resolved: {formatDate(ticket.resolved_at)}
                                                    </p>
                                                )}
                                            </div>

                                            {ticket.status !== 'solved' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(ticket.id)}
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default SupportSection;