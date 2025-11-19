"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Ticket, 
    AlertCircle, 
    CheckCircle, 
    Clock, 
    TrendingUp,
    Users,
    Activity
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <Card>
        <CardContent className="pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
                    {trend && (
                        <p className="text-xs text-muted-foreground mt-1">{trend}</p>
                    )}
                </div>
                <div className={`p-3 rounded-full ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </CardContent>
    </Card>
);

const AdminStatsDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Loading statistics...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Unable to load statistics</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Tickets"
                    value={stats.totals.total_tickets || 0}
                    icon={Ticket}
                    color="bg-blue-500/10 text-blue-500"
                />
                <StatCard
                    title="Active Tickets"
                    value={stats.totals.active_tickets || 0}
                    icon={Clock}
                    color="bg-yellow-500/10 text-yellow-500"
                />
                <StatCard
                    title="Solved Tickets"
                    value={stats.totals.solved_tickets || 0}
                    icon={CheckCircle}
                    color="bg-green-500/10 text-green-500"
                />
                <StatCard
                    title="High Priority"
                    value={stats.totals.high_priority_tickets || 0}
                    icon={AlertCircle}
                    color="bg-red-500/10 text-red-500"
                    trend="Urgent + High"
                />
            </div>

            {/* Status Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Status Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                            <div key={status} className="p-4 border rounded-lg">
                                <p className="text-sm font-medium text-muted-foreground capitalize">
                                    {status.replace('_', ' ')}
                                </p>
                                <p className="text-2xl font-bold mt-1">{count}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Priority & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Priority Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Priority Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(stats.priorityBreakdown).map(([priority, count]) => {
                                const colors = {
                                    urgent: 'bg-red-500',
                                    high: 'bg-orange-500',
                                    medium: 'bg-yellow-500',
                                    low: 'bg-blue-500'
                                };
                                const total = Object.values(stats.priorityBreakdown).reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;

                                return (
                                    <div key={priority}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium capitalize">{priority}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {count} ({percentage}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${colors[priority]}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Category Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Category Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(stats.categoryBreakdown).slice(0, 6).map(([category, count]) => {
                                const total = Object.values(stats.categoryBreakdown).reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;

                                return (
                                    <div key={category}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium capitalize">
                                                {category.replace('_', ' ')}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {count} ({percentage}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full bg-primary"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Tickets Created (Last 7 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.recentTickets.length > 0 ? (
                        <div className="space-y-2">
                            {stats.recentTickets.map((day) => (
                                <div key={day.date} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                    <span className="text-sm font-medium">
                                        {new Date(day.date).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </span>
                                    <span className="text-sm font-semibold">{day.count} tickets</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No tickets created in the last 7 days
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
                <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">Avg Resolution Time</p>
                            <p className="text-3xl font-bold">
                                {parseFloat(stats.averageResolutionHours).toFixed(1)}
                                <span className="text-lg font-normal text-muted-foreground ml-1">hours</span>
                            </p>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">Resolution Rate</p>
                            <p className="text-3xl font-bold">
                                {stats.totals.total_tickets > 0
                                    ? ((stats.totals.solved_tickets / stats.totals.total_tickets) * 100).toFixed(1)
                                    : 0}
                                <span className="text-lg font-normal text-muted-foreground ml-1">%</span>
                            </p>
                        </div>
                        <div className="text-center p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground mb-2">Active Users</p>
                            <p className="text-3xl font-bold">
                                {stats.topUsers.length}
                                <span className="text-lg font-normal text-muted-foreground ml-1">users</span>
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Top Users */}
            {stats.topUsers.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Top Users by Ticket Count
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats.topUsers.slice(0, 5).map((user, index) => (
                                <div key={user.email} className="flex items-center justify-between py-2 border-b last:border-b-0">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                            {index + 1}
                                        </span>
                                        <div>
                                            <p className="text-sm font-medium">{user.name}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-semibold">{user.ticket_count} tickets</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AdminStatsDashboard;