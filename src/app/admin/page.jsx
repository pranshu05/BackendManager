"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/ui/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Shield,
    Ticket,
    BarChart3,
    RefreshCw,
    X
} from 'lucide-react';
import AdminTicketsList from '@/components/(admin)/AdminTicketsList';
import AdminStatsDashboard from '@/components/(admin)/AdminStatsDashboard';

export default function AdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        checkAdminAccess();
    }, []);

    const checkAdminAccess = async () => {
        try {
            const res = await fetch('/api/admin/check');
            if (res.ok) {
                const data = await res.json();
                if (!data.isAdmin) {
                    // Not an admin, redirect to dashboard
                    router.push('/dashboard');
                    return;
                }
                setIsAdmin(true);
            } else {
                // Not authenticated or error
                router.push('/');
            }
        } catch (error) {
            console.error('Error checking admin access:', error);
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                        <p className="text-muted-foreground">Verifying admin access...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!isAdmin) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Admin Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-foreground">Admin Panel</h1>
                            <p className="text-muted-foreground">
                                Manage support tickets and view system statistics
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => router.push('/help')}
                        className="p-2 rounded-full cursor-pointer text-muted-foreground hover:bg-gray-500/10 transition-colors"
                        aria-label="Close">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Admin Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="overview" className="flex items-center gap-2 cursor-pointer">
                            <BarChart3 className="w-4 h-4" />
                            Overview & Stats
                        </TabsTrigger>
                        <TabsTrigger value="tickets" className="flex items-center gap-2 cursor-pointer">
                            <Ticket className="w-4 h-4" />
                            Support Tickets
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-0">
                        <AdminStatsDashboard />
                    </TabsContent>

                    <TabsContent value="tickets" className="mt-0">
                        <AdminTicketsList />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}