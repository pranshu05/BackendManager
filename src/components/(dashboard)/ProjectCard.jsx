import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Database,
    CheckCircle,
    Clock,
    AlertCircle,
    ExternalLink,
    Settings,
    Table
} from 'lucide-react';

export function ProjectCard({ project }) {
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

    return (
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
                    <Button
                        size="sm"
                        className="flex-1"
                        disabled={project.database.status !== 'connected'}
                          onClick={() => {
                            // Open database action
                            window.location.href = `/dashboard/projects/${project.id}`;
                        }}
                    >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Open
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={project.database.status !== 'connected'}
                    >
                        <Settings className="w-4 h-4" />
                    </Button>
                </div>

                {/* Creation Date */}
                <div className="text-xs text-muted-foreground border-t border-border pt-2">
                    Created on {new Date(project.createdAt).toLocaleDateString()}
                </div>
            </CardContent>
        </Card>
    );
}