// Table component for displaying support tickets
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function TicketsTable() {
    const router = useRouter();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    useEffect(() => {
        fetchTickets();
    }, []);
    
    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/help/tickets');
            const data = await res.json();
            if (data.ok) {
                setTickets(data.tickets || []);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const filteredTickets = tickets.filter(ticket => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            ticket.id.toLowerCase().includes(query) ||
            ticket.subject.toLowerCase().includes(query) ||
            ticket.description.toLowerCase().includes(query)
        );
    });
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'resolved':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'open':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };
    
    if (loading) {
        return <div className="text-center py-8 text-gray-500">Loading tickets...</div>;
    }
    
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                        type="text"
                        placeholder="Search by keyword, subject, or ticket ID"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button
                    onClick={() => router.push('/help')}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    New Ticket
                </Button>
            </div>
            
            <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-300">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">SUBJECT</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">DATE</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">STATUS</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ACTION</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredTickets.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                    No tickets found.
                                </td>
                            </tr>
                        ) : (
                            filteredTickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">{ticket.id.slice(0, 8)}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{ticket.subject}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {formatDate(ticket.createdAt)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                // Could navigate to a detail page or show modal
                                                alert(`Ticket Details:\n\nSubject: ${ticket.subject}\nDescription: ${ticket.description}\nStatus: ${ticket.status}\nCreated: ${formatDate(ticket.createdAt)}`);
                                            }}
                                        >
                                            View Details
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
