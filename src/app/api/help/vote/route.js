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
            return ${Math.round(avgHours)}h;
        } else {
            return ${Math.round(avgHours / 24)}d;
        }
    };
    
    const avgResponse = calculateAvgResponse();
    const activeTickets = tickets.filter(t => t.status !== 'resolved').length;
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const pendingTickets = tickets.filter(t => t.status === 'pending').length;
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Header />
            <div className="flex flex-col lg:flex-row">
                {/* Left Sidebar */}
                <div className="lg:w-56 flex-shrink-0">
                    <HelpSidebar />
                </div>
                
                {/* Main Content */}
                <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
                    {/* Center Content */}
                    <div className="flex-1 space-y-4">
                        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-5 text-white shadow-lg">
                            <h1 className="text-2xl font-bold mb-1">
                                My Tickets & Support
                            </h1>
                            <p className="text-white/90 text-sm">
                                Track and manage your support requests
                            </p>
                        </div>
                        
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-3 hover:shadow-lg transition-all duration-300">
                                <div className="text-2xl font-bold text-primary mb-0.5">{totalTickets}</div>
                                <div className="text-xs text-gray-600 font-medium">Total Tickets</div>
                            </div>
                            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-3 hover:shadow-lg transition-all duration-300">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span className="text-2xl font-bold text-green-600">{resolvedTickets}</span>
                                </div>
                                <div className="text-xs text-gray-600 font-medium">Resolved</div>
                            </div>
                            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-3 hover:shadow-lg transition-all duration-300">
                                <div className="text-2xl font-bold text-orange-600 mb-0.5">{activeTickets}</div>
                                <div className="text-xs text-gray-600 font-medium">
                                    Active
                                    {activeTickets > 0 && (
                                        <span className="text-gray-500 ml-1 text-[10px]">
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
                    <div className="lg:w-64 flex-shrink-0">
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 space-y-3 sticky top-4">
                            <h3 className="text-lg font-bold text-gray-900">How to Use DBuddy</h3>
                            
                            <div className="space-y-2">
                                <div className="flex gap-2 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
                                    <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Database className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 text-xs mb-0.5">Connect Database</div>
                                        <div className="text-[10px] text-gray-600 leading-tight">
                                            Choose DB type and connect securely.
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 p-2 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
                                    <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MessageSquare className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 text-xs mb-0.5">Natural Queries</div>
                                        <div className="text-[10px] text-gray-600 leading-tight">
                                            Ask in plain English, get SQL results.
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 p-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
                                    <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <BarChart3 className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 text-xs mb-0.5">Optimize Queries</div>
                                        <div className="text-[10px] text-gray-600 leading-tight">
                                            View optimization suggestions.
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 p-2 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
                                    <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Clock className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 text-xs mb-0.5">Query History</div>
                                        <div className="text-[10px] text-gray-600 leading-tight">
                                            Revisit and modify old queries.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <button className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white py-2 px-4 rounded-lg text-sm font-semibold shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all duration-300">
                                Watch Demo
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}