"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Database, HelpCircle, Ticket, Search, CheckCircle, Download, User, LogOut } from "lucide-react";

export default function TicketsPage() {
    const router = useRouter();
    const [tickets, setTickets] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        resolved: 0,
        active: 0,
        open: 0,
        pending: 0
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTickets();
    }, [searchQuery]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) {
                params.append("search", searchQuery);
            }
            
            const response = await fetch(`/api/help/tickets?${params.toString()}`);
            const data = await response.json();
            
            setTickets(data.tickets || []);
            setStats(data.stats || stats);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (ticketId) => {
        try {
            const response = await fetch(`/api/help/tickets/${ticketId}`);
            const data = await response.json();
            setSelectedTicket(data.ticket);
            setIsModalOpen(true);
        } catch (error) {
            console.error("Error fetching ticket details:", error);
        }
    };

    const handleUpdateTicket = async (field, value) => {
        if (!selectedTicket) return;

        try {
            const response = await fetch(`/api/help/tickets/${selectedTicket.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ [field]: value })
            });

            const data = await response.json();
            
            if (response.ok) {
                setSelectedTicket(data.ticket);
                fetchTickets(); // Refresh tickets list
            }
        } catch (error) {
            console.error("Error updating ticket:", error);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            Open: "bg-blue-100 text-blue-700 border-blue-300",
            Resolved: "bg-green-100 text-green-700 border-green-300",
            Pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
            High: "bg-red-100 text-red-700 border-red-300"
        };
        
        return (
            <Badge className={`${styles[status] || "bg-gray-100 text-gray-700"} border`}>
                {status}
            </Badge>
        );
    };

    const getPriorityBadge = (priority) => {
        const styles = {
            Low: "bg-gray-100 text-gray-700 border-gray-300",
            Medium: "bg-orange-100 text-orange-700 border-orange-300",
            High: "bg-red-100 text-red-700 border-red-300"
        };
        
        return (
            <Badge className={`${styles[priority] || "bg-gray-100 text-gray-700"} border`}>
                {priority}
            </Badge>
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { 
            month: "short", 
            day: "numeric", 
            year: "numeric" 
        });
    };

    const getSubject = (description) => {
        if (!description) return "No description";
        const words = description.split(" ");
        return words.slice(0, 6).join(" ") + (words.length > 6 ? "..." : "");
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/";
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = "/";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-card/80 backdrop-blur-sm border-b border-border px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-primary rounded-xl">
                            <Database className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">DBuddy</h1>
                            <p className="text-sm text-primary">Your Database Companion</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/dashboard")}
                            className="cursor-pointer"
                        >
                            Dashboard
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/profile")}
                            className="cursor-pointer">
                            <User className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLogout}
                            className="cursor-pointer">
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex min-h-[calc(100vh-80px)]">
                {/* Left Sidebar */}
                <aside className="w-64 bg-white border-r border-gray-300 p-6">
                    <nav className="space-y-2">
                        <button
                            onClick={() => router.push("/help")}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                            <HelpCircle className="w-5 h-5" />
                            General FAQ
                        </button>
                        <button
                            onClick={() => router.push("/help/tickets")}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors"
                        >
                            <Ticket className="w-5 h-5" />
                            My Tickets
                        </button>
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="mb-6">
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                My Tickets & Support
                            </h2>
                            <p className="text-gray-600">
                                Track and manage your support requests
                            </p>
                        </div>

                        {/* Stats Boxes */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card className="bg-white border-gray-200 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                                            <p className="text-xs text-gray-600 mt-1">Total Tickets Submitted</p>
                                        </div>
                                        <Ticket className="w-8 h-8 text-blue-600" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-gray-200 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
                                                <CheckCircle className="w-5 h-5 text-green-600" />
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1">Tickets Resolved</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-gray-200 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                                            <p className="text-xs text-gray-600 mt-1">Active Tickets</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {stats.open} Open, {stats.pending} Pending
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Search Bar */}
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search by keyword, subject, or ticket ID"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 w-full bg-white border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>

                        {/* Tickets Table */}
                        <Card className="bg-white border-gray-200 shadow-sm">
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-b border-gray-300">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    ID
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    SUBJECT
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    DATE
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    STATUS
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    PRIORITY
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                                    ACTION
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                        Loading tickets...
                                                    </td>
                                                </tr>
                                            ) : tickets.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                        No tickets found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                tickets.map((ticket) => (
                                                    <tr
                                                        key={ticket.id}
                                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                        onClick={() => handleViewDetails(ticket.id)}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {ticket.id}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-700">
                                                            {getSubject(ticket.description)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                            {formatDate(ticket.created_at)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {getStatusBadge(ticket.status)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            {getPriorityBadge(ticket.priority)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewDetails(ticket.id);
                                                                }}
                                                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
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
                            </CardContent>
                        </Card>
                    </div>
                </main>

                {/* Right Panel - Guide Section */}
                <aside className="w-80 bg-white border-l border-gray-300 p-6">
                    <div className="sticky top-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6">
                            How to Use DBuddy
                        </h3>
                        
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Database className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-1">
                                        Connect Your Database
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        Choose your DB type and securely connect your credentials.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <HelpCircle className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-1">
                                        Run Natural Language Queries
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        Ask queries in plain English and get instant SQL results.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-1">
                                        Optimize Queries
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        Use the 'Optimization' tab to view 21 suggestions.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Ticket className="w-5 h-5 text-blue-600" />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-1">
                                        Track Query History
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        Revisit, export, or modify your old queries anytime.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => router.push("/dashboard")}
                        >
                            Watch Demo
                        </Button>
                    </div>
                </aside>
            </div>

            {/* Ticket Details Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Ticket Details</DialogTitle>
                        <DialogDescription>
                            View and update ticket information
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedTicket && (
                        <div className="space-y-6 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Ticket ID
                                    </label>
                                    <p className="text-gray-900">#{selectedTicket.id}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date Created
                                    </label>
                                    <p className="text-gray-900">
                                        {new Date(selectedTicket.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Name
                                </label>
                                <p className="text-gray-900">{selectedTicket.name}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <p className="text-gray-900">{selectedTicket.email}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Project
                                </label>
                                <p className="text-gray-900">{selectedTicket.project}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Error Type
                                </label>
                                <p className="text-gray-900">{selectedTicket.error_type}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                                    {selectedTicket.description}
                                </p>
                            </div>

                            {selectedTicket.attachment_path && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Attachment
                                    </label>
                                    <a
                                        href={selectedTicket.attachment_path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Download Attachment</span>
                                    </a>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Status
                                    </label>
                                    <Select
                                        value={selectedTicket.status}
                                        onChange={(e) => handleUpdateTicket("status", e.target.value)}
                                        className="bg-white border-gray-300"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Open">Open</option>
                                        <option value="Resolved">Resolved</option>
                                    </Select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Priority
                                    </label>
                                    <Select
                                        value={selectedTicket.priority}
                                        onChange={(e) => handleUpdateTicket("priority", e.target.value)}
                                        className="bg-white border-gray-300"
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

