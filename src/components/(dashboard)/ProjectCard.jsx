'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {
    Database,
    CheckCircle,
    Clock,
    AlertCircle,
    ExternalLink,
    Settings,
    Table,
    Trash2,
    Pencil
} from 'lucide-react';
import { showToast } from "nextjs-toast-notify";

export function ProjectCard({ project, onDeleted }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const getStatusIcon = () => {
        switch (project.database.status) {
            case 'connected':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'creating':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'error':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
        }
    };

    const getStatusText = () => {
        switch (project.database.status) {
            case 'connected':
                return 'Connected';
            case 'creating':
                return 'Creating...';
            case 'error':
                return 'Error';
        }
    };

    const getStatusColor = () => {
        switch (project.database.status) {
            case 'connected':
                return 'bg-green-100 text-green-800';
            case 'creating':
                return 'bg-yellow-100 text-yellow-800';
            case 'error':
                return 'bg-red-100 text-red-800';
        }
    };

    const handleEditProject = () => {
        setEditName(project.name || "");
        setEditDescription(project.description || "");
        setIsEditModalOpen(true);
        setMenuOpen(false);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        
        if (!editName.trim()) {
            showToast.error('Project name cannot be empty', {
                duration: 2000,
                progress: true,
                position: "top-center",
                transition: "bounceIn",
            });
            return;
        }

        setEditLoading(true);
        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectName: editName.trim(),
                    description: editDescription.trim()
                })
            });

            const data = await res.json();

            if (!res.ok) {
                showToast.error(data.error || 'Failed to update project', {
                    duration: 3000,
                    progress: true,
                    position: "top-center",
                    transition: "bounceIn",
                });
                return;
            }

            showToast.success('Project updated successfully!', {
                duration: 3000,
                progress: true,
                position: "top-center",
                transition: "bounceIn",
            });

            setIsEditModalOpen(false);
            
            // Reload page to reflect changes
            if (typeof window !== 'undefined') {
                window.location.reload();
            }
        } catch (err) {
            showToast.error('Error updating project: ' + (err?.message || err), {
                duration: 3000,
                progress: true,
                position: "top-center",
                transition: "bounceIn",
            });
        } finally {
            setEditLoading(false);
        }
    };

    const handleDeleteProject = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to delete project');
            }

            if (onDeleted) {
                onDeleted(project.id);
            } else if (typeof window !== 'undefined') {
                window.location.reload();
            }
        } catch (error) {
            console.error('Delete project error:', error);
            alert(error.message || 'Unable to delete project right now.');
        } finally {
            setIsDeleting(false);
            setConfirmOpen(false);
        }
    };

    return (
        <>
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 bg-card/90 backdrop-blur-sm border-accent/20">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2">
                            <Database className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                        </div>
                        <Badge className={`flex items-center space-x-1 ${getStatusColor()}`}>
                            {getStatusIcon()}
                            <span className="text-xs">{getStatusText()}</span>
                        </Badge>
                    </div>
                    <CardDescription className="text-sm line-clamp-2">
                        {project.description}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Database Info */}
                    <div className="bg-accent/20 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">Database</span>
                            <span className="text-xs text-muted-foreground font-mono">{project.database.name}</span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-1">
                                <Table className="w-4 h-4 text-muted-foreground" />
                                <span className="text-foreground">{project.database.tables} tables</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                Modified {project.database.lastModified}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                        <Link
                            href={`/dashboard/projects/${project.id}`}
                            className="flex-1"
                            onClick={(e) => { if (project.database.status !== 'connected') { e.preventDefault(); } }}
                        >
                            <Button
                                size="sm"
                                className="w-full cursor-pointer"
                                disabled={project.database.status !== 'connected'}
                            >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Open
                            </Button>
                        </Link>
                        <div className="relative" ref={menuRef}>
                            <Button
                                className="cursor-pointer"
                                size="sm"
                                variant="outline"
                                disabled={project.database.status !== 'connected'}
                                onClick={() => setMenuOpen((prev) => !prev)}
                            >
                                <Settings className="w-4 h-4" />
                            </Button>
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-card shadow-lg z-20 p-1">
                                    <button
                                        className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                                        onClick={handleEditProject}
                                    >
                                        <Pencil className="w-4 h-4 text-blue-500" />
                                        Edit Project
                                    </button>
                                    <button
                                        className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                                        onClick={() => {
                                            setConfirmOpen(true);
                                            setMenuOpen(false);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                        Delete Database
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Creation Date */}
                    <div className="text-xs text-muted-foreground border-t border-border pt-2">
                        Created on {new Date(project.createdAt).toLocaleDateString()}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isEditModalOpen} onOpenChange={(open) => !editLoading && setIsEditModalOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>
                            Update your project name and description
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium mb-1">
                                Project Name
                                <span className="text-red-500 ml-1" aria-hidden>
                                    *
                                </span>
                            </label>
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Enter project name"
                                className="border rounded p-2"
                                required
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-sm font-medium mb-1">Description</label>
                            <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Enter project description (optional)"
                                className="border rounded p-2 min-h-[100px]"
                                rows={4}
                            />
                        </div>
                        <DialogFooter>
                            <Button className="cursor-pointer" type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={editLoading}>
                                Cancel
                            </Button>
                            <Button className="cursor-pointer" type="submit" disabled={editLoading}>
                                {editLoading ? 'Updating...' : 'Update'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={confirmOpen} onOpenChange={(open) => !isDeleting && setConfirmOpen(open)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete this database?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete <span className="font-semibold">{project.database.name}</span> and all of its data. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button className="cursor-pointer" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button className="cursor-pointer" variant="destructive" onClick={handleDeleteProject} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ProjectCard.propTypes = {
    project: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        database: PropTypes.shape({
            name: PropTypes.string.isRequired,
            status: PropTypes.oneOf(['connected', 'creating', 'error']).isRequired,
            tables: PropTypes.number.isRequired,
            lastModified: PropTypes.string.isRequired,
        }).isRequired,
        createdAt: PropTypes.string.isRequired,
    }).isRequired,
    onDeleted: PropTypes.func,
};

ProjectCard.defaultProps = {
    onDeleted: undefined,
};