"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/(dashboard)/ProjectCard";
import ImportDatabase from '@/components/(dashboard)/ImportDatabase';
import { Database, LogOut, CheckCircle, Table, User } from "lucide-react";

export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjectsData = async () => {
            try {
                const res = await fetch("/api/projects", { cache: "no-store" });

                if (!res.ok) {
                    console.error("Failed to fetch projects", res.status);
                    setProjects([]);
                    return;
                }

                const data = await res.json();
                setProjects(data.projects || []);
            } catch (err) {
                console.error("Error fetching projects:", err);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProjectsData();
    }, []);

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/";
        } catch (error) {
            console.error("Logout error:", error);
            window.location.href = "/";
        }
    };

    console.log("Projects data:", projects);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-secondary/30">
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
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => (window.location.href = "/profile")}
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
                </div>
            </header>

            {/* Main content */}
            <main className="p-6 max-w-7xl mx-auto space-y-8">
                {/* Welcome Section */}
                <div className="text-center space-y-4 py-8">
                    <h2 className="text-3xl font-bold text-foreground">
                        Welcome back 👋
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Create and manage your databases with natural language. No SQL
                        knowledge required.
                    </p>
                </div>

                {/* Projects */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-semibold text-foreground">
                            Your Projects
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground">
                                {projects.length} project{projects.length !== 1 ? "s" : ""}
                            </div>
                            <ImportDatabase onImported={(proj) => {
                                // Refresh project list by re-fetching
                                (async () => {
                                    try {
                                        const res = await fetch('/api/projects', { cache: 'no-store' });
                                        const data = await res.json();
                                        setProjects(data.projects || []);
                                    } catch (err) {
                                        console.error('Failed to refresh projects after import', err);
                                    }
                                })();
                            }} />
                        </div>
                    </div>

                    {loading ? (
                        <Card className="text-center py-12">
                            <CardContent>Loading projects...</CardContent>
                        </Card>
                    ) : projects.length === 0 ? (
                        <Card className="text-center py-12">
                            <CardContent className="space-y-4">
                                <Database className="w-16 h-16 text-muted-foreground mx-auto" />
                                <div>
                                    <h3 className="text-lg font-medium text-foreground">
                                        No projects yet
                                    </h3>
                                    <p className="text-muted-foreground">
                                        Create your first project to get started
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {projects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={{
                                        id: project.id,
                                        name: project.project_name,
                                        description: project.description,
                                        database: {
                                            name: project.project_name,
                                            status: project.is_active ? "connected" : "error",
                                            tables: project.table_count || 0,
                                            lastModified: new Date(
                                                project.updated_at
                                            ).toLocaleString(),
                                        },
                                        createdAt: project.created_at,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Quick Stats */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-2">
                                <Database className="w-8 h-8 text-primary" />
                                <div>
                                    <p className="text-2xl font-bold text-foreground">
                                        {projects.length}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Total Projects
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-secondary/10 to-secondary/5 border-secondary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-2">
                                <CheckCircle className="w-8 h-8 text-secondary" />
                                <div>
                                    <p className="text-2xl font-bold text-foreground">
                                        {projects.filter((p) => p.is_active).length}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Active Databases
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-secondary/10 to-secondary/5 border-secondary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-2">
                                <Table className="w-8 h-8 text-accent-foreground" />
                                <div>
                                    <p className="text-2xl font-bold text-foreground">
                                        {projects.reduce((total, project) => total + (project.table_count || 0), 0)}
                                    </p>
                                    <p className="text-sm text-muted-foreground">Total Tables</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    );
}