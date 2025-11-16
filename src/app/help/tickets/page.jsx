// My Tickets & Support page
"use client";

import { useState, useEffect } from 'react';
import Header from '@/components/ui/header';
import HelpSidebar from '@/components/help/HelpSidebar';
import TicketsTable from '@/components/help/TicketsTable';
import { Database, MessageSquare, BarChart3, Clock, CheckCircle } from 'lucide-react';

export default function TicketsPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    
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
    
    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
    
    // Calculate average response time (mock calculation)
    const calculateAvgResponse = () => {
        const resolved = tickets.filter(t => t.status === 'resolved');
        if (resolved.length === 0) return 'N/A';
        
        let totalHours = 0;
        resolved.forEach(ticket => {
            const created = new Date(ticket.createdAt);
            const updated = new Date(ticket.updatedAt);
            const hours = (updated - created) / (1000 * 60 * 60);
            totalHours += hours;
        });
        
        const avgHours = totalHours / resolved.length;
        if (avgHours < 24) {
            return `${Math.round(avgHours)}h`;
        } else {
            return `${Math.round(avgHours / 24)}d`;
        }
    };
    
    const avgResponse = calculateAvgResponse();
    const activeTickets = tickets.filter(t => t.status !== 'resolved').length;
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const pendingTickets = tickets.filter(t => t.status === 'pending').length;
    
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <div className="flex flex-col lg:flex-row">
                {/* Left Sidebar */}
                <div className="lg:w-56 flex-shrink-0">
                    <HelpSidebar />
                </div>
                
                {/* Main Content */}
                <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6">
                    {/* Center Content */}
                    <div className="flex-1 space-y-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                My Tickets & Support
                            </h1>
                            <p className="text-gray-600">
                                Track and manage your support requests
                            </p>
                        </div>
                        
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white border border-gray-300 rounded-lg p-4">
                                <div className="text-2xl font-bold text-gray-900">{totalTickets}</div>
                                <div className="text-sm text-gray-600">Total Tickets Submitted</div>
                            </div>
                            <div className="bg-white border border-gray-300 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span className="text-2xl font-bold text-gray-900">{resolvedTickets}</span>
                                </div>
                                <div className="text-sm text-gray-600">Tickets Resolved</div>
                            </div>
                            <div className="bg-white border border-gray-300 rounded-lg p-4">
                                <div className="text-2xl font-bold text-gray-900">{activeTickets}</div>
                                <div className="text-sm text-gray-600">
                                    Active Tickets
                                    {activeTickets > 0 && (
                                        <span className="text-gray-500 ml-1">
                                            ({openTickets} Open, {pendingTickets} Pending)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Loading tickets...</div>
                        ) : (
                            <TicketsTable />
                        )}
                    </div>
                    
                    {/* Right Sidebar - How to Use DBuddy */}
                    <div className="lg:w-80 flex-shrink-0">
                        <div className="bg-white border border-gray-300 rounded-lg p-6 space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">How to Use DBuddy</h3>
                            
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-gray-900">Connect Your Database</div>
                                        <div className="text-sm text-gray-600">
                                            Choose your DB type and securely connect your credentials.
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-gray-900">Run Natural Language Queries</div>
                                        <div className="text-sm text-gray-600">
                                            Ask queries in plain English and get instant SQL results.
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-gray-900">Optimize Queries</div>
                                        <div className="text-sm text-gray-600">
                                            Use the 'Optimization' tab to view suggestions.
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-gray-900">Track Query History</div>
                                        <div className="text-sm text-gray-600">
                                            Revisit, export, or modify your old queries anytime.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium">
                                Watch Demo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

