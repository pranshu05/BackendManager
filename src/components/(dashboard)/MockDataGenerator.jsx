'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Database, Eye, Play, Settings, Lightbulb, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MockDataGenerator({ projectId, onSuccess }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [config, setConfig] = useState({});
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [activeTab, setActiveTab] = useState('configure');

    // Load schema analysis when dialog opens
    useEffect(() => {
        if (isOpen && !analysis) {
            loadSchemaAnalysis();
        }
    }, [isOpen]);

    const loadSchemaAnalysis = async () => {
        setAnalyzing(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/mock-data`);
            const data = await response.json();
            
            if (data.success) {
                setAnalysis(data);
                // Initialize config with suggested counts
                const initialConfig = {};
                Object.keys(data.suggestions).forEach(tableName => {
                    initialConfig[tableName] = {
                        count: data.suggestions[tableName].recommendedCount,
                        options: {}
                    };
                });
                setConfig(initialConfig);
            } else {
                throw new Error(data.message || 'Failed to analyze schema');
            }
        } catch (error) {
            console.error('Schema analysis failed:', error);
            setResult({ success: false, message: error.message });
        } finally {
            setAnalyzing(false);
        }
    };

    const generatePreview = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/mock-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config,
                    template: selectedTemplate,
                    preview: true
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setPreview(data);
                setActiveTab('preview');
            } else {
                throw new Error(data.message || 'Failed to generate preview');
            }
        } catch (error) {
            console.error('Preview generation failed:', error);
            setResult({ success: false, message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const generateMockData = async () => {
        setGenerating(true);
        try {
            const response = await fetch(`/api/projects/${projectId}/mock-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config,
                    template: selectedTemplate,
                    preview: false
                })
            });
            
            const data = await response.json();
            setResult(data);
            
            if (data.success) {
                setActiveTab('result');
                onSuccess?.();
            }
        } catch (error) {
            console.error('Mock data generation failed:', error);
            setResult({ success: false, message: error.message });
        } finally {
            setGenerating(false);
        }
    };

    const updateTableConfig = (tableName, field, value) => {
        setConfig(prev => ({
            ...prev,
            [tableName]: {
                ...prev[tableName],
                [field]: value
            }
        }));
    };

    const updateColumnOption = (tableName, columnName, option, value) => {
        setConfig(prev => ({
            ...prev,
            [tableName]: {
                ...prev[tableName],
                options: {
                    ...prev[tableName]?.options,
                    [columnName]: {
                        ...prev[tableName]?.options?.[columnName],
                        [option]: value
                    }
                }
            }
        }));
    };

    const applyTemplate = (templateName) => {
        if (!analysis?.templates?.includes(templateName)) return;
        
        setSelectedTemplate(templateName);
        // Template configuration will be merged on the backend
        setActiveTab('configure');
    };

    const resetDialog = () => {
        setAnalysis(null);
        setConfig({});
        setSelectedTemplate('');
        setPreview(null);
        setResult(null);
        setActiveTab('configure');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetDialog();
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Database className="h-4 w-4" />
                    Generate Mock Data
                </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Mock Data Generator
                    </DialogTitle>
                </DialogHeader>

                {analyzing ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        Analyzing database schema...
                    </div>
                ) : analysis ? (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="configure" className="gap-2">
                                <Settings className="h-4 w-4" />
                                Configure
                            </TabsTrigger>
                            <TabsTrigger value="templates" className="gap-2">
                                <Lightbulb className="h-4 w-4" />
                                Templates
                            </TabsTrigger>
                            <TabsTrigger value="preview" className="gap-2">
                                <Eye className="h-4 w-4" />
                                Preview
                            </TabsTrigger>
                            <TabsTrigger value="result" className="gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Result
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="configure" className="space-y-4">
                            <div className="grid gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Table Configuration</h3>
                                    <div className="flex gap-2">
                                        <Button 
                                            onClick={generatePreview} 
                                            disabled={loading}
                                            variant="outline"
                                            size="sm"
                                        >
                                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                            Preview
                                        </Button>
                                        <Button 
                                            onClick={generateMockData} 
                                            disabled={generating}
                                            size="sm"
                                        >
                                            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                            Generate
                                        </Button>
                                    </div>
                                </div>

                                {selectedTemplate && (
                                    <Alert>
                                        <Lightbulb className="h-4 w-4" />
                                        <AlertDescription>
                                            Using template: <strong>{selectedTemplate}</strong>. You can still customize individual table settings below.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="grid gap-4 max-h-96 overflow-y-auto">
                                    {Object.entries(analysis.suggestions).map(([tableName, suggestion]) => (
                                        <Card key={tableName}>
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base">{tableName}</CardTitle>
                                                    <Badge variant="outline">
                                                        {suggestion.dependencies.length} dependencies
                                                    </Badge>
                                                </div>
                                                {suggestion.dependencies.length > 0 && (
                                                    <CardDescription className="text-xs">
                                                        Depends on: {suggestion.dependencies.map(dep => dep.table).join(', ')}
                                                    </CardDescription>
                                                )}
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="flex items-center gap-4">
                                                    <Label htmlFor={`count-${tableName}`} className="text-sm font-medium">
                                                        Record Count:
                                                    </Label>
                                                    <Input
                                                        id={`count-${tableName}`}
                                                        type="number"
                                                        min="1"
                                                        max="10000"
                                                        value={config[tableName]?.count || suggestion.recommendedCount}
                                                        onChange={(e) => updateTableConfig(tableName, 'count', parseInt(e.target.value))}
                                                        className="w-24"
                                                    />
                                                </div>

                                                {Object.keys(suggestion.columnSuggestions).length > 0 && (
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Column Options:</Label>
                                                        <div className="grid gap-2 text-xs">
                                                            {Object.entries(suggestion.columnSuggestions).map(([columnName, columnSuggestion]) => (
                                                                <div key={columnName} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                                                    <span className="font-medium min-w-20">{columnName}:</span>
                                                                    <span className="text-gray-600">{columnSuggestion.description}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="templates" className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Predefined Templates</h3>
                                <div className="grid gap-4">
                                    {analysis.templates.map(template => (
                                        <Card key={template} className={`cursor-pointer transition-colors ${selectedTemplate === template ? 'ring-2 ring-blue-500' : ''}`}>
                                            <CardContent className="p-4" onClick={() => applyTemplate(template)}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <h4 className="font-semibold capitalize">{template.replace('_', ' ')}</h4>
                                                        <p className="text-sm text-gray-600">
                                                            {getTemplateDescription(template)}
                                                        </p>
                                                    </div>
                                                    <Button 
                                                        variant={selectedTemplate === template ? "default" : "outline"}
                                                        size="sm"
                                                    >
                                                        {selectedTemplate === template ? 'Selected' : 'Use Template'}
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="preview" className="space-y-4">
                            {preview ? (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold">Data Preview</h3>
                                        <Badge variant="outline">
                                            {preview.summary.totalRecords} total records across {preview.summary.tablesProcessed} tables
                                        </Badge>
                                    </div>
                                    
                                    <div className="space-y-4 max-h-96 overflow-y-auto">
                                        {Object.entries(preview.preview).map(([tableName, records]) => (
                                            <Card key={tableName}>
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-base">{tableName}</CardTitle>
                                                    <CardDescription>Showing first 3 records</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="border-b">
                                                                    {records.length > 0 && Object.keys(records[0]).map(column => (
                                                                        <th key={column} className="text-left p-1 font-medium">
                                                                            {column}
                                                                        </th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {records.map((record, index) => (
                                                                    <tr key={index} className="border-b">
                                                                        {Object.values(record).map((value, colIndex) => (
                                                                            <td key={colIndex} className="p-1 max-w-32 truncate">
                                                                                {value === null ? (
                                                                                    <span className="text-gray-400 italic">null</span>
                                                                                ) : (
                                                                                    String(value)
                                                                                )}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    <div className="flex justify-end gap-2 pt-4">
                                        <Button onClick={() => setActiveTab('configure')} variant="outline">
                                            Back to Configure
                                        </Button>
                                        <Button onClick={generateMockData} disabled={generating}>
                                            {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                            Generate Data
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-600 mb-4">No preview available. Generate a preview first.</p>
                                    <Button onClick={generatePreview} disabled={loading}>
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                        Generate Preview
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="result" className="space-y-4">
                            {result ? (
                                <div className="space-y-4">
                                    <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                                        {result.success ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                        )}
                                        <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                                            {result.message}
                                        </AlertDescription>
                                    </Alert>

                                    {result.summary && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Generation Summary</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="font-medium">Tables Processed:</span>
                                                        <span className="ml-2">{result.summary.tablesProcessed}</span>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Total Records:</span>
                                                        <span className="ml-2">{result.summary.totalRecords}</span>
                                                    </div>
                                                    {result.summary.successfulTables !== undefined && (
                                                        <>
                                                            <div>
                                                                <span className="font-medium text-green-600">Successful Tables:</span>
                                                                <span className="ml-2">{result.summary.successfulTables}</span>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-red-600">Failed Tables:</span>
                                                                <span className="ml-2">{result.summary.failedTables}</span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Successful Tables */}
                                    {result.successfulTables && result.successfulTables.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-green-600 flex items-center gap-2">
                                                    <CheckCircle className="h-5 w-5" />
                                                    Successfully Generated Data
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    {result.successfulTables.map(({ table, records }) => (
                                                        <div key={table} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                                                            <span className="font-medium">{table}</span>
                                                            <Badge variant="outline" className="bg-white text-green-700 border-green-300">
                                                                {records} records
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Failed Tables */}
                                    {result.failedTables && result.failedTables.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-red-600 flex items-center gap-2">
                                                    <AlertCircle className="h-5 w-5" />
                                                    Failed to Generate Data
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    {result.failedTables.map(({ table, error, records }) => (
                                                        <div key={table} className="p-3 bg-red-50 rounded border border-red-200">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-medium">{table}</span>
                                                                <Badge variant="outline" className="bg-white text-red-700 border-red-300">
                                                                    {records} records attempted
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-red-600">{error}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    <div className="flex justify-end">
                                        <Button onClick={() => setIsOpen(false)}>
                                            Close
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-600">No results yet. Generate mock data to see results.</p>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-gray-600">Failed to load schema analysis.</p>
                        <Button onClick={loadSchemaAnalysis} className="mt-4">
                            Retry
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function getTemplateDescription(template) {
    const descriptions = {
        ecommerce: 'Complete e-commerce setup with products, categories, customers, and orders',
        blog: 'Blog platform with authors, posts, categories, and comments',
        user_management: 'User system with roles, permissions, and user accounts'
    };
    return descriptions[template] || 'Predefined data template for common use cases';
}