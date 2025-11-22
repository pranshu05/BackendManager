"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/(dashboard)/ProjectCard";
import ImportDatabase from '@/components/(dashboard)/ImportDatabase';
import { showToast } from "nextjs-toast-notify";
import { Database, LogOut, CheckCircle, Table, User, Sparkles, HelpCircle, Search } from "lucide-react";
import './index.css';

export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nlInput, setNlInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
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
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include"
            });
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
        showToast.error('Please enter a project description before creating.', {
          duration: 2000,
          progress: true,
          position: "top-center",
          transition: "bounceIn",
        });
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
                        showToast.error('Invalid or expired session. Please log in again.', {
                            duration: 2000,
                            progress: true,
                            position: "top-center",
                            transition: "bounceIn",
                        });

                        return;
                    }
                    showToast.error(data.error || 'Failed to create project', {
                        duration: 2000,
                        progress: true,
                        position: "top-center",
                        transition: "bounceIn",
                    });
                    return;
                }

                // Success — provide feedback and refresh the page (or re-fetch projects)
                showToast.success(data.message || 'Project created successfully', {
                    duration: 2000,
                    progress: true,
                    position: "top-center",
                    transition: "bounceIn",
                });
               await new Promise(resolve => setTimeout(resolve, 3000));
                    
               
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
               showToast.error('An error occurred while creating the project. Please try again.', {
                    duration: 2000,
                    progress: true,
                    position: "top-center",
                    transition: "bounceIn",
                });
            } finally {
                setCreating(false);
            }
        })();
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
                                onClick={() => (window.location.href = "/help")}
                                className="cursor-pointer"
                                title="Help & Support">
                                <HelpCircle className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => (window.location.href = "/profile")}
                                className="cursor-pointer"
                                title="Profile">
                                <User className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLogout}
                                className="cursor-pointer"
                                title="Logout">
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
                        className="cp-button cursor-pointer"
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
                        <h2 className="text-2xl font-semibold text-foreground">
                            Your Projects
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="search"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search projects..."
                                        className="pl-9 pr-3 py-2 rounded-md border border-border bg-card/60 text-sm focus:outline-none"
                                    />
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {projects.length} project{projects.length !== 1 ? "s" : ""}
                                </div>
                            </div>
                            <ImportDatabase onImported={(proj) => {
                                window.location.reload();
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
                        (() => {
                            const filteredProjects = projects.filter((project) => {
                                if (!searchTerm || !searchTerm.trim()) return true;
                                const q = searchTerm.toLowerCase();
                                const name = (project.project_name || '').toLowerCase();
                                const desc = (project.description || '').toLowerCase();
                                return name.includes(q) || desc.includes(q);
                            });

                            if (filteredProjects.length === 0) {
                                return (
                                    <Card className="text-center py-12">
                                        <CardContent className="space-y-4">
                                            <div>
                                                <h3 className="text-lg font-medium text-foreground">No projects match your search</h3>
                                                <p className="text-muted-foreground">Try a different keyword or clear the search.</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            }

                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredProjects.map((project) => {
                                        const normalizedProject = {
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
                                        };

                                        return (
                                            <ProjectCard
                                                key={project.id}
                                                project={normalizedProject}
                                                onDeleted={(deletedId) =>
                                                    setProjects((prev) => prev.filter((p) => p.id !== deletedId))
                                                }
                                            />
                                        );
                                    })}
                                </div>
                            );
                        })()
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