"use client";
import { useState } from "react";
import { Sparkles, Database, TrendingUp, Code , X} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import './summary_index.css'

export default function SummaryCard({ projectId, onClose }) {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);


    // Mock data for testing (remove this when API is ready)
    const MOCK_SUMMARY = {
        quickStats: {
            totalTables: 6,
            totalColumns: 45,
            totalRelationships: 8,
            estimatedRows: "2,450 records"
        },
        description: "An e-commerce system handling everything from customer accounts to order processing. Currently managing 150 customers, 500 products, and 800 completed orders with full purchase history.\n\nTrack customer buying patterns, monitor which products are selling well, and keep tabs on inventory levels. See who's ordering what, when payments come through, and which items need restocking.\n\nEverything is connected - customers link to their orders, orders show what products were bought, and inventory updates automatically. Clean data organization makes reporting and analytics straightforward.",
        techSpecs: "PostgreSQL with UUID primary keys and foreign key constraints. Indexed on common query paths. ACID compliant with timestamp auditing."
    };

    const fetchSummary = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(`/api/projects/${projectId}/summary`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate summary');
            }
            
            const data = await response.json();
            setSummary(data.summary);
        } catch (err) {
            console.error('Error fetching summary:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="summary-card">
            {/* Header */}
            <div className="summary-header">
                <div className="header-left">
                    <Database className="icon-blue" />
                    <h3 className="heading">Database Summary</h3>
                </div>
                
                <div className="close-button">
                    <X onClick = {onClose}className="icon cursor-pointer"/>
                </div>
                
            
            </div>

            {/* Initial State */}
            {!summary && !loading && !error && (
                <div className="initial-state">
                    <Sparkles className="initial-icon" />
                    <p className="initial-text">
                        Here is an AI-powered summary of your
                        database structure and contents
                    </p>
                    <Button onClick={fetchSummary} className="generate-btn cursor-pointer">
                        <Sparkles className="w-4 h-4" />
                        Generate Summary
                    </Button>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="loading-state">
                    <DotLottieReact
                        src="https://lottie.host/bc9b7976-f4d5-43d6-bf35-d97023948cbd/0LrKX98liy.lottie"
                        loop
                        autoplay
                        className="loading-lottie"
                    />
                    <p className="loading-main">Analyzing database...</p>
                    <p className="loading-sub">This may take a few moments</p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="error-box">
                    <div className="error-row">
                        <svg className="error-icon" fill="none" viewBox="0 0 24 24">
                            <path
                                stroke="currentColor"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <div className="error-text">
                            <h4 className="error-title">Failed to generate summary</h4>
                            <p className="error-msg">{error}</p>
                        </div>
                    </div>
                    <Button onClick={fetchSummary} className="error-btn cursor-pointer">
                        Try Again
                    </Button>
                </div>
            )}

            {/* Summary Content */}
            {summary && (
                <div className="summary-section">
                    {/* Quick Stats */}
                    <div className="stats-card">
                        <div className="stats-title-row">
                            <TrendingUp className="stats-icon" />
                            <h4 className="stats-title">Quick Stats</h4>
                        </div>

                        <div className="stats-grid">
                            <div className="stats-item">
                                <div className="stats-number blue">{summary.quickStats.totalTables}</div>
                                <div className="stats-label">Tables</div>
                            </div>

                            <div className="stats-item">
                                <div className="stats-number purple">{summary.quickStats.totalColumns}</div>
                                <div className="stats-label">Columns</div>
                            </div>

                            <div className="stats-item">
                                <div className="stats-number green">{summary.quickStats.totalRelationships}</div>
                                <div className="stats-label">Relations</div>
                            </div>

                            <div className="stats-item">
                                <div className="stats-number orange">
                                    {summary.quickStats.estimatedRows.split(" ")[0]}
                                </div>
                                <div className="stats-label">Records</div>
                            </div>
                        </div>
                    </div>

                    {/* What's Inside */}
                    <div className="inside-box">
                        <h4 className="inside-title">What's Inside</h4>
                        <div className="inside-content">
                            <p>{summary.description}</p>
                        </div>
                    </div>

                    {/* Tech Specs */}
                    <div className="tech-box">
                        <div className="tech-title-row">
                            <Code className="tech-icon" />
                            <h4 className="tech-title">Tech Specs</h4>
                        </div>
                        <div className="tech-content">
                            <p>{summary.techSpecs}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
}