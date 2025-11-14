"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/(dashboard)/ProjectCard";
import ImportDatabase from '@/components/(dashboard)/ImportDatabase';
import { Database, LogOut, CheckCircle, Table, User, Sparkles } from "lucide-react";
import ThemeSwitcher from "@/components/ui/ThemeSwitcher";
import './index.css';

export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nlInput, setNlInput] = useState("");
    const [creating, setCreating] = useState(false);

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

     const handleCreateProjectandDatabase = () => {
        // POST the natural language input to the AI create-project API
        (async () => {
            if (!nlInput || !nlInput.trim()) {
                alert('Please enter a project description before creating.');
                return;
            }

            setCreating(true);
            try {
                const res = await fetch('/api/ai/create-project', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ naturalLanguageInput: nlInput }),
                    credentials: 'same-origin' // ensure session cookie is sent
                });

                const data = await res.json();
                if (!res.ok) {
                    console.error('Create project failed', data);
                    if (res.status === 401) {
                        // likely session expired or not authenticated
                        alert(data.error || 'Invalid or expired session. Please log in again.');
                        // redirect to login page
                        return;
                    }
                    alert(data.error || 'Failed to create project');
                    return;
                }

                // Success — provide feedback and refresh the page (or re-fetch projects)
                alert(data.message || 'Project created successfully');
                
                // If API returned project id, optionally navigate to it.
                if (data.project && data.project.id) {
                    // try to navigate to project page
                    window.location.href = `/dashboard/projects/${data.project.id}`;
                } else {
                    // fallback: reload to refresh the projects list
                    window.location.reload();
                }
            } catch (err) {
                console.error('Error creating project:', err);
                alert('An unexpected error occurred while creating the project.');
            } finally {
                setCreating(false);
            }
        })();
    };

    console.log("Projects data:", projects);

    return (
        <div className="min-h-screen" style={{ background: "var(--background)" }}>
            {/* Header */}
            <header 
                className="backdrop-blur-sm border-b px-6 py-4"
                style={{
                    background: "var(--panel-bg)",
                    borderColor: "var(--border)",
                    boxShadow: "var(--shadow)"
                }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-xl" style={{ background: "var(--primary)" }}>
                            <Database className="w-6 h-6" style={{ color: "var(--primary-contrast)" }} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>DBuddy</h1>
                            <p className="text-sm" style={{ color: "var(--primary)" }}>Your Database Companion</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => (window.location.href = "/profile")}
                                className="cursor-pointer"
                                style={{
                                    background: "transparent",
                                    borderColor: "var(--border)",
                                    color: "var(--text)"
                                }}
                            >
                                <User className="w-4 h-4" />
                            </Button>
                            <ThemeSwitcher />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLogout}
                                className="cursor-pointer"
                                style={{
                                    background: "transparent",
                                    borderColor: "var(--border)",
                                    color: "var(--text)"
                                }}
                            >
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
                    <h2 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
                        Welcome back 👋
                    </h2>
                    <p className="text-xl max-w-2xl mx-auto" style={{ color: "var(--muted-text)" }}>
                        Create and manage your databases with natural language. No SQL
                        knowledge required.
                    </p>
                </div>

                <div className="cp-card">
                    <div className="cp-header">
                        <span className="cp-icon" aria-hidden>
                            <Sparkles className="sparkles" />
                        </span>
                            <h2 className="cp-title">
                                Create New Project
                            </h2>
                            </div>
                                <p className="cp-subtitle">
                                Describe your project and we'll automatically create the database and schema for you
                                </p>
                            <textarea
                                className="cp-textarea"
                                placeholder="Example: I want to create a database for managing employee records with departments, salaries, and performance reviews..."
                                rows={5}
                                value={nlInput}
                                onChange={(e) => setNlInput(e.target.value)}
                            />
                            <button
                                className="cp-button"
                                type="button"
                                onClick={handleCreateProjectandDatabase}
                                disabled={creating || !nlInput.trim()}
                            >
                                <span className="cp-plus" aria-hidden></span>
                                <span>{creating ? "Creating..." : "+ Create Project & Database"}</span>
                            </button>
                </div>
                

                {/* Projects */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
                            Your Projects
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="text-sm" style={{ color: "var(--muted-text)" }}>
                                {projects.length} project{projects.length !== 1 ? "s" : ""}
                            </div>
                            <ImportDatabase onImported={(proj) => {
    window.location.reload();
}} />
                        </div>
                    </div>

                    {loading ? (
                        <Card 
                            className="text-center py-12"
                            style={{
                                background: "var(--panel-bg)",
                                borderColor: "var(--border)",
                                color: "var(--text)"
                            }}
                        >
                            <CardContent style={{ color: "var(--text)" }}>Loading projects...</CardContent>
                        </Card>
                    ) : projects.length === 0 ? (
                        <Card 
                            className="text-center py-12"
                            style={{
                                background: "var(--panel-bg)",
                                borderColor: "var(--border)",
                                color: "var(--text)"
                            }}
                        >
                            <CardContent className="space-y-4">
                                <Database className="w-16 h-16 mx-auto" style={{ color: "var(--muted-text)" }} />
                                <div>
                                    <h3 className="text-lg font-medium" style={{ color: "var(--text)" }}>
                                        No projects yet
                                    </h3>
                                    <p style={{ color: "var(--muted-text)" }}>
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
                    <Card 
                        style={{
                            background: "var(--accent)",
                            borderColor: "var(--border)",
                            boxShadow: "var(--shadow)"
                        }}
                    >
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-2">
                                <Database className="w-8 h-8" style={{ color: "var(--primary)" }} />
                                <div>
                                    <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                                        {projects.length}
                                    </p>
                                    <p className="text-sm" style={{ color: "var(--muted-text)" }}>
                                        Total Projects
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card 
                        style={{
                            background: "var(--accent)",
                            borderColor: "var(--border)",
                            boxShadow: "var(--shadow)"
                        }}
                    >
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-2">
                                <CheckCircle className="w-8 h-8" style={{ color: "var(--primary)" }} />
                                <div>
                                    <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                                        {projects.filter((p) => p.is_active).length}
                                    </p>
                                    <p className="text-sm" style={{ color: "var(--muted-text)" }}>
                                        Active Databases
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card 
                        style={{
                            background: "var(--accent)",
                            borderColor: "var(--border)",
                            boxShadow: "var(--shadow)"
                        }}
                    >
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-2">
                                <Table className="w-8 h-8" style={{ color: "var(--primary)" }} />
                                <div>
                                    <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                                        {projects.reduce((total, project) => total + (project.table_count || 0), 0)}
                                    </p>
                                    <p className="text-sm" style={{ color: "var(--muted-text)" }}>Total Tables</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    );
}