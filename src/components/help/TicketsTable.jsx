// Table component for displaying support tickets
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Search, Paperclip } from 'lucide-react';
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
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-primary transition-colors" />
                    <Input
                        type="text"
                        placeholder="Search by keyword, subject, or ticket ID"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-9 text-sm rounded-xl border-2 border-gray-200 focus:border-primary"
                    />
                </div>
                <Button
                    onClick={() => router.push('/help')}
                    className="bg-primary hover:bg-primary/90 text-white h-9 px-4 rounded-lg text-sm font-semibold shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all duration-300"
                >
                    + New Ticket
                </Button>
            </div>
            
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                        <tr>
                            <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">ID</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">SUBJECT</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">DATE</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">STATUS</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">ATTACHMENT</th>
                            <th className="px-3 py-2 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider">ACTION</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredTickets.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-3 py-6 text-center text-gray-500">
                                    <p className="text-sm">No tickets found.</p>
                                </td>
                            </tr>
                        ) : (
                            filteredTickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-3 py-2 text-xs font-medium text-gray-900">{ticket.id.slice(0, 8)}</td>
                                    <td className="px-3 py-2 text-xs text-gray-900 font-medium">{ticket.subject}</td>
                                    <td className="px-3 py-2 text-xs text-gray-600">
                                        {formatDate(ticket.createdAt)}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(ticket.status)}`}>
                                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        {ticket.attachment ? (
                                            <button
                                                onClick={() => {
                                                    // Show attachment in modal or new tab
                                                    const win = window.open();
                                                    win.document.write(`
                                                        <html>
                                                            <head><title>${ticket.attachment.name}</title></head>
                                                            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                                                                <img src="${ticket.attachment.data}" style="max-width:100%;max-height:100vh;" />
                                                            </body>
                                                        </html>
                                                    `);
                                                }}
                                                className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                                                title={ticket.attachment.name}
                                            >
                                                <Paperclip className="w-3 h-3" />
                                                <span className="text-[10px]">View</span>
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-gray-400">None</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                // Show ticket details with attachment
                                                let details = `Ticket Details:\n\nSubject: ${ticket.subject}\nDescription: ${ticket.description}\nStatus: ${ticket.status}\nCreated: ${formatDate(ticket.createdAt)}`;
                                                if (ticket.attachment) {
                                                    details += `\nAttachment: ${ticket.attachment.name} (${(ticket.attachment.size / 1024).toFixed(1)} KB)`;
                                                }
                                                alert(details);
                                            }}
                                            className="h-7 px-2 text-xs rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-all duration-200"
                                        >
                                            View
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