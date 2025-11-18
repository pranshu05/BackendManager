"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";

export default function Optimization() {
    const params = useParams();
    const projectid = params.slug;
    const [optimizationData, setOptimizationData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionStatus, setActionStatus] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const fetchOptimizationData = useCallback(async () => {
        if (!projectid) return;
        try {
            setLoading(true);
            const response = await fetch(`/api/projects/${projectid}/optimization`);
            if (!response.ok) throw new Error('Failed to fetch optimization data');
            const data = await response.json();
            setOptimizationData(data);
            setError(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [projectid]);

    useEffect(() => {
        if (projectid) {
            fetchOptimizationData();
        }
    }, [projectid, fetchOptimizationData]);

    const handleApplyOptimization = useCallback(async (sql, category, index, description) => {
        if (!projectid || !sql) return;
        try {
            setActionLoading(true);
            setActionStatus(null);
            const response = await fetch(`/api/projects/${projectid}/optimization`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: 'apply',
                    sql,
                    description: description || 'Database optimization'
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data?.error || 'Failed to apply optimization');
            }

            // Remove the applied suggestion from UI
            setOptimizationData(prev => {
                if (!prev) return prev;
                
                const newData = { ...prev };
                
                if (category === 'missingIndexes') {
                    newData.missingIndexes = [...prev.missingIndexes];
                    newData.missingIndexes.splice(index, 1);
                } else if (category === 'schemaImprovements') {
                    newData.schemaImprovements = [...prev.schemaImprovements];
                    newData.schemaImprovements.splice(index, 1);
                }
                
                newData.totalSuggestions = Math.max(0, (prev.totalSuggestions || 0) - 1);
                
                return newData;
            });

            setActionStatus({ type: 'success', message: data.message || 'Optimization applied successfully.' });
            setShowSuccessModal(true);
        } catch (err) {
            setActionStatus({ type: 'error', message: err.message || 'Failed to apply optimization.' });
        } finally {
            setActionLoading(false);
        }
    }, [projectid]);

    const handleDismiss = useCallback((category, index) => {
        setOptimizationData(prev => {
            if (!prev) return prev;
            
            const newData = { ...prev };
            
            if (category === 'missingIndexes') {
                newData.missingIndexes = [...prev.missingIndexes];
                newData.missingIndexes.splice(index, 1);
            } else if (category === 'schemaImprovements') {
                newData.schemaImprovements = [...prev.schemaImprovements];
                newData.schemaImprovements.splice(index, 1);
            } else if (category === 'potentialIssues') {
                newData.potentialIssues = [...prev.potentialIssues];
                newData.potentialIssues.splice(index, 1);
            }
            
            newData.totalSuggestions = Math.max(0, (prev.totalSuggestions || 0) - 1);
            
            return newData;
        });
    }, []);

    const styles = {
        optimizationContainer: {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: "0px",
            width: "100%",
            background: "linear-gradient(135deg, #F3F3E0 0%, rgba(203, 220, 235, 0.2) 50%, rgba(96, 139, 193, 0.3) 82.27%), #F3F3E0",
            minHeight: "100%",
        },
        headerSection: {
            position: "relative",
            width: "100%",
            padding: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(4px)",
            borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
        },
        title: {
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 700,
            fontSize: "32px",
            lineHeight: "24px",
            color: "#2B5A9E",
            margin: 0,
            padding: 0,
        },
        suggestionCount: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "13px 25px",
            background: "#FFFFFF",
            border: "0.8px solid rgba(0, 0, 0, 0.1)",
            borderRadius: "14px",
            gap: "10px",
            minWidth: "255px",
        },
        countNumber: {
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 700,
            fontSize: "20px",
            lineHeight: "36px",
            color: "#2B5A9E",
        },
        countLabel: {
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "20px",
            color: "#1A1A1A",
        },
        card: {
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: "24px",
            gap: "24px",
            width: "90%",
            margin: "24px auto",
            background: "#FFFFFF",
            border: "0.8px solid rgba(0, 0, 0, 0.1)",
            borderRadius: "14px",
        },
        cardAlert: {
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            padding: "24px",
            gap: "16px",
            width: "90%",
            margin: "24px auto",
            background: "#FFFFFF",
            borderWidth: "0.8px 0.8px 0.8px 4px",
            borderStyle: "solid",
            borderColor: "#D4183D",
            borderRadius: "14px",
        },
        cardHeader: {
            width: "100%",
        },
        cardTitle: {
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "16px",
            lineHeight: "16px",
            color: "#1A1A1A",
            margin: 0,
            padding: "0 0 8px 0",
        },
        cardDescription: {
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "16px",
            lineHeight: "24px",
            color: "#6B7280",
            margin: 0,
            padding: 0,
        },
        cardContent: {
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
        },
        performanceItem: {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            width: "100%",
        },
        performanceHeader: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
        },
        queryName: {
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "20px",
            color: "#1A1A1A",
        },
        queryTime: {
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "20px",
            color: "#6B7280",
        },
        progressBar: {
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            width: "100%",
            height: "8px",
            background: "rgba(43, 90, 158, 0.2)",
            borderRadius: "999px",
            overflow: "hidden",
        },
        progressFill: {
            height: "100%",
            background: "#2B5A9E",
            borderRadius: "999px",
            transition: "width 0.3s ease",
        },
        alertHeader: {
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: "16px",
            width: "100%",
        },
        alertIcon: {
            fontSize: "16px",
            width: "16px",
            height: "16px",
            flexShrink: 0,
            marginTop: "4px",
        },
        alertTitleContainer: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "8px",
            flex: 1,
        },
        alertTitle: {
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "16px",
            lineHeight: "24px",
            color: "#1A1A1A",
            margin: 0,
            padding: 0,
        },
        badgeHigh: {
            background: "#D4183D",
            color: "#FFFFFF",
            padding: "2px 8px",
            borderRadius: "8px",
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "12px",
            lineHeight: "16px",
            whiteSpace: "nowrap",
        },
        alertDescription: {
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "16px",
            lineHeight: "24px",
            color: "#6B7280",
            margin: 0,
            padding: 0,
            width: "100%",
        },
        alertBox: {
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: "16px",
            width: "100%",
            padding: "16px",
            background: "#FFFFFF",
            border: "0.8px solid rgba(0, 0, 0, 0.1)",
            borderRadius: "10px",
        },
        alertDetails: {
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            flex: 1,
        },
        alertLabel: {
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "20px",
            color: "#1A1A1A",
            margin: 0,
            padding: 0,
            letterSpacing: "-0.35px",
        },
        sqlCode: {
            fontFamily: "'Cousine', monospace",
            fontWeight: 400,
            fontSize: "12px",
            lineHeight: "16px",
            color: "#6B7280",
            wordBreak: "break-all",
            background: "#F5F3ED",
            padding: "8px",
            borderRadius: "4px",
            margin: "4px 0 0 0",
        },
        performanceInsight: {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "8px",
            padding: 0,
            marginTop: "8px",
        },
        improvementIcon: {
            fontSize: "16px",
        },
        improvementText: {
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "20px",
            color: "#6B7280",
        },
        actionButtons: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "8px",
            width: "100%",
        },
        buttonIgnore: {
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            width: "auto",
            height: "32px",
            background: "#F5F3ED",
            border: "0.8px solid rgba(0, 0, 0, 0.1)",
            borderRadius: "8px",
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "20px",
            color: "#1A1A1A",
            cursor: "pointer",
            transition: "all 0.2s ease",
        },
        buttonApply: {
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            width: "auto",
            height: "32px",
            background: "#2B5A9E",
            border: "none",
            borderRadius: "8px",
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            lineHeight: "20px",
            color: "#FFFFFF",
            cursor: "pointer",
            transition: "all 0.2s ease",
        },
        tableContainer: {
            width: "100%",
            overflowX: "auto",
        },
        dataTable: {
            width: "100%",
            borderCollapse: "collapse",
            background: "#FFFFFF",
            border: "1px solid #000000",
        },
        tableHeader: {
            background: "#F5F3ED",
        },
        tableHeaderCell: {
            padding: "12px 16px",
            textAlign: "left",
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "16px",
            lineHeight: "24px",
            color: "#000000",
            border: "1px solid #000000",
        },
        tableRow: {
            borderBottom: "1px solid #000000",
        },
        tableCell: {
            padding: "12px 16px",
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "16px",
            lineHeight: "24px",
            color: "#000000",
            background: "#FFFFFF",
            borderRight: "1px solid #000000",
            borderLeft: "1px solid #000000",
        },
        centerAlign: {
            textAlign: "center",
        },
        actionCell: {
            textAlign: "center",
        },
        actionButton: {
            background: "transparent",
            border: "none",
            color: "#2B5A9E",
            cursor: "pointer",
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "14px",
            padding: "4px 8px",
            borderRadius: "4px",
            transition: "all 0.2s ease",
        },
        duplicateBadge: {
            background: "#EDFF77",
            color: "#F00000",
            padding: "4px 8px",
            borderRadius: "7px",
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "16px",
            lineHeight: "24px",
        },
        removeButton: {
            background: "transparent",
            border: "1px solid #EDFF77",
            color: "#F00000",
            cursor: "pointer",
            fontFamily: "'Arimo', sans-serif",
            fontWeight: 400,
            fontSize: "16px",
            padding: "6px 12px",
            borderRadius: "7px",
            transition: "all 0.2s ease",
        },
        modalOverlay: {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
        },
        modalContent: {
            background: "#FFFFFF",
            padding: "32px",
            borderRadius: "16px",
            width: "320px",
            textAlign: "center",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            fontFamily: "'Arimo', sans-serif",
        },
        modalTitle: {
            fontSize: "20px",
            fontWeight: 600,
            marginBottom: "12px",
            color: "#065f46",
        },
        modalButton: {
            marginTop: "16px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "none",
            background: "#2B5A9E",
            color: "#FFFFFF",
            cursor: "pointer",
            fontSize: "14px",
        },
        statusBanner: {
            width: "90%",
            margin: "0 auto 12px auto",
            padding: "12px 16px",
            borderRadius: "10px",
            fontFamily: "'Arimo', sans-serif",
            fontSize: "15px",
        },
        statusSuccess: {
            background: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #34d399",
        },
        statusError: {
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fca5a5",
        },
        loadingContainer: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100vh",
            fontFamily: "'Arimo', sans-serif",
            fontSize: "16px",
            color: "#2B5A9E",
        },
        errorContainer: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100vh",
            fontFamily: "'Arimo', sans-serif",
            fontSize: "16px",
            color: "#D4183D",
        },
    };

    const queryPerformance = useMemo(
        () => (optimizationData && optimizationData.queryPerformance) ? optimizationData.queryPerformance : [],
        [optimizationData]
    );
    const maxQueryTime = useMemo(
        () => Math.max(...queryPerformance.map(item => item.time || 0), 1),
        [queryPerformance]
    );
    const missingIndexes = optimizationData?.missingIndexes || [];
    const schemaImprovements = optimizationData?.schemaImprovements || [];
    const potentialIssues = optimizationData?.potentialIssues || [];

    if (loading) {
        return <div style={styles.loadingContainer}>Loading optimization data...</div>;
    }

    if (error) {
        return <div style={styles.errorContainer}>Error: {error}</div>;
    }

    return (
        <div style={styles.optimizationContainer}>
            {/* Header Section */}
            <div style={styles.headerSection}>
                <h1 style={styles.title}>Optimization Suggestions</h1>
                <div style={styles.suggestionCount}>
                    <span style={styles.countNumber}>
                        {optimizationData?.totalSuggestions || 0}
                    </span>
                    <span style={styles.countLabel}>Total Suggestions</span>
                </div>
            </div>

            {optimizationData?.warning && (
                <div style={{ ...styles.card, borderColor: "#FACC15", color: "#92400E", margin: "24px auto", width: "90%" }}>
                    {optimizationData.warning}
                </div>
            )}

            {actionStatus && (
                <div
                    style={{
                        ...styles.statusBanner,
                        ...(actionStatus.type === 'success' ? styles.statusSuccess : styles.statusError)
                    }}
                >
                    {actionStatus.message}
                </div>
            )}

            {/* Query Performance Card */}
            {queryPerformance.length > 0 && (
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h2 style={styles.cardTitle}>Query Performance</h2>
                        <p style={styles.cardDescription}>
                            AI-estimated execution times for common query patterns
                        </p>
                    </div>
                    <div style={styles.cardContent}>
                        {queryPerformance.map((query, idx) => (
                            <div key={`${query.name}-${idx}`} style={styles.performanceItem}>
                                <div style={styles.performanceHeader}>
                                    <span style={styles.queryName}>{query.name}</span>
                                    <span style={styles.queryTime}>{query.time}ms</span>
                                </div>
                                <div style={styles.progressBar}>
                                    <div 
                                        style={{
                                            ...styles.progressFill,
                                            width: `${Math.min(100, (query.time / maxQueryTime) * 100)}%`
                                        }}
                                    ></div>
                                </div>
                                {query.suggestion && (
                                    <p style={{...styles.cardDescription, marginTop: "8px", fontSize: "14px"}}>
                                        💡 {query.suggestion}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Missing Indexes */}
            {missingIndexes.length > 0 && missingIndexes.map((index, idx) => (
                <div key={`index-${idx}`} style={styles.cardAlert}>
                    <div style={styles.alertHeader}>
                        <div style={styles.alertIcon}>⚠️</div>
                        <div style={styles.alertTitleContainer}>
                            <h3 style={styles.alertTitle}>
                                Missing Index: {index.tableName}.{index.columnName}
                            </h3>
                            <span style={styles.badgeHigh}>{index.severity || "HIGH"}</span>
                        </div>
                    </div>
                    <p style={styles.alertDescription}>
                        {index.reason || `Adding an index on this column could improve query performance.`}
                    </p>
                    <div style={styles.cardContent}>
                        <div style={styles.alertBox}>
                            <div style={styles.alertIcon}>💡</div>
                            <div style={styles.alertDetails}>
                                <p style={styles.alertLabel}>SQL Command</p>
                                <code style={styles.sqlCode}>
                                    {index.suggestion}
                                </code>
                            </div>
                        </div>
                        {index.estimatedImprovement && (
                            <div style={styles.performanceInsight}>
                                <span style={styles.improvementIcon}>📈</span>
                                <span style={styles.improvementText}>
                                    Estimated improvement: {index.estimatedImprovement}
                                </span>
                            </div>
                        )}
                    </div>
                    <div style={styles.actionButtons}>
                        <button
                            style={{ ...styles.buttonIgnore, opacity: actionLoading ? 0.7 : 1 }}
                            disabled={actionLoading}
                            onClick={() => handleDismiss('missingIndexes', idx)}
                        >
                            <span>✕</span> Ignore
                        </button>
                        <button
                            style={{ ...styles.buttonApply, opacity: actionLoading ? 0.7 : 1 }}
                            disabled={actionLoading}
                            onClick={() => handleApplyOptimization(
                                index.suggestion, 
                                'missingIndexes', 
                                idx,
                                `Index optimization: ${index.reason || 'Improve query performance'}`
                            )}
                        >
                            <span>✓</span> Apply Index
                        </button>
                    </div>
                </div>
            ))}

            {/* Schema Improvements */}
            {schemaImprovements.length > 0 && (
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h2 style={styles.cardTitle}>Schema Improvements</h2>
                        <p style={styles.cardDescription}>
                            AI-recommended improvements to your database schema
                        </p>
                    </div>
                    <div style={styles.cardContent}>
                        {schemaImprovements.map((improvement, idx) => (
                            <div key={`improvement-${idx}`} style={{
                                ...styles.alertBox,
                                marginBottom: idx < schemaImprovements.length - 1 ? "16px" : "0"
                            }}>
                                <div style={styles.alertDetails}>
                                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px"}}>
                                        <p style={styles.alertLabel}>
                                            <strong>{improvement.tableName}</strong> - {improvement.issue}
                                        </p>
                                        <span style={{
                                            ...styles.badgeHigh,
                                            background: improvement.priority === 'HIGH' ? '#D4183D' : 
                                                       improvement.priority === 'MEDIUM' ? '#F59E0B' : '#10B981',
                                            padding: "2px 8px",
                                            borderRadius: "4px",
                                            fontSize: "12px"
                                        }}>
                                            {improvement.priority || "MEDIUM"}
                                        </span>
                                    </div>
                                    {improvement.suggestion && (
                                        <code style={styles.sqlCode}>
                                            {improvement.suggestion}
                                        </code>
                                    )}
                                    {improvement.impact && (
                                        <p style={{...styles.cardDescription, marginTop: "8px", fontSize: "14px"}}>
                                            Impact: {improvement.impact}
                                        </p>
                                    )}
                                    <div style={{...styles.actionButtons, marginTop: "12px"}}>
                                        <button
                                            style={{ ...styles.buttonIgnore, opacity: actionLoading ? 0.7 : 1 }}
                                            disabled={actionLoading}
                                            onClick={() => handleDismiss('schemaImprovements', idx)}
                                        >
                                            <span>✕</span> Dismiss
                                        </button>
                                        {improvement.suggestion && improvement.suggestion.trim().toUpperCase().startsWith('ALTER') && (
                                            <button
                                                style={{ ...styles.buttonApply, opacity: actionLoading ? 0.7 : 1 }}
                                                disabled={actionLoading}
                                                onClick={() => handleApplyOptimization(
                                                    improvement.suggestion, 
                                                    'schemaImprovements', 
                                                    idx,
                                                    `Schema improvement: ${improvement.issue} - ${improvement.impact || 'Optimize database structure'}`
                                                )}
                                            >
                                                <span>✓</span> Apply
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Potential Issues */}
            {potentialIssues.length > 0 && (
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h2 style={styles.cardTitle}>Potential Issues</h2>
                        <p style={styles.cardDescription}>
                            AI-identified issues that may require manual review
                        </p>
                    </div>
                    <div style={styles.tableContainer}>
                        <table style={styles.dataTable}>
                            <thead style={styles.tableHeader}>
                                <tr>
                                    <th style={styles.tableHeaderCell}>Table</th>
                                    <th style={styles.tableHeaderCell}>Issue</th>
                                    <th style={styles.tableHeaderCell}>Severity</th>
                                    <th style={styles.tableHeaderCell}>Recommendation</th>
                                    <th style={styles.tableHeaderCell}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {potentialIssues.map((issue, idx) => (
                                    <tr key={`issue-${idx}`} style={styles.tableRow}>
                                        <td style={styles.tableCell}>{issue.tableName}</td>
                                        <td style={styles.tableCell}>{issue.issue}</td>
                                        <td style={{ ...styles.tableCell, ...styles.centerAlign }}>
                                            <span style={{
                                                ...styles.badgeHigh,
                                                background: issue.severity === 'HIGH' ? '#D4183D' : 
                                                           issue.severity === 'MEDIUM' ? '#F59E0B' : '#10B981',
                                                padding: "4px 8px",
                                                borderRadius: "4px"
                                            }}>
                                                {issue.severity || "MEDIUM"}
                                            </span>
                                        </td>
                                        <td style={styles.tableCell}>{issue.recommendation}</td>
                                        <td style={{ ...styles.tableCell, ...styles.actionCell }}>
                                            <button
                                                style={styles.actionButton}
                                                onClick={() => handleDismiss('potentialIssues', idx)}
                                            >
                                                Dismiss
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccessModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>✓ Optimization Applied</h3>
                        <p>Your optimization has been successfully applied to the database.</p>
                        <button
                            style={styles.modalButton}
                            onClick={() => setShowSuccessModal(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}