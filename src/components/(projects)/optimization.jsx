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

    const adjustOptimizationData = useCallback((updater) => {
        setOptimizationData(prev => {
            if (!prev) return prev;
            const draft = typeof updater === 'function' ? updater(prev) : prev;
            return draft;
        });
    }, []);

    const decrementSuggestions = useCallback(() => {
        adjustOptimizationData(prev => ({
            ...prev,
            totalSuggestions: Math.max(0, (prev.totalSuggestions ?? 0) - 1)
        }));
    }, [adjustOptimizationData]);

    const dismissHighlightedIndex = useCallback(() => {
        adjustOptimizationData(prev => {
            if (!prev?.missingIndexes || prev.missingIndexes.length === 0) return prev;
            const [, ...rest] = prev.missingIndexes;
            return {
                ...prev,
                missingIndexes: rest,
                totalSuggestions: Math.max(0, (prev.totalSuggestions ?? 0) - 1)
            };
        });
    }, [adjustOptimizationData]);

    const applyLocalActionResult = useCallback((action, result) => {
        adjustOptimizationData(prev => {
            if (!prev) return prev;
            if (action === 'create_index') {
                const [, ...rest] = prev.missingIndexes || [];
                return {
                    ...prev,
                    missingIndexes: rest,
                    totalSuggestions: Math.max(0, (prev.totalSuggestions ?? 0) - 1)
                };
            }
            if (action === 'remove_table') {
                const filtered = (prev.unusedTables || []).filter(
                    table => table.tableName !== result?.tableName
                );
                return {
                    ...prev,
                    unusedTables: filtered,
                    totalSuggestions: Math.max(0, (prev.totalSuggestions ?? 0) - 1)
                };
            }
            if (action === 'remove_duplicates') {
                const filtered = (prev.duplicateRecords || []).filter(
                    record =>
                        !(
                            record.tableName === result?.tableName &&
                            record.columnName === result?.columnName
                        )
                );
                return {
                    ...prev,
                    duplicateRecords: filtered,
                    totalSuggestions: Math.max(0, (prev.totalSuggestions ?? 0) - 1)
                };
            }
            return prev;
        });
    }, [adjustOptimizationData]);

    const handleOptimizationAction = useCallback(async ({ action, targetTable, targetColumn, duplicateIds }) => {
        if (!projectid || !action || !targetTable) return;
        try {
            setActionLoading(true);
            setActionStatus(null);
            const response = await fetch(`/api/projects/${projectid}/optimization`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    targetTable,
                    targetColumn,
                    duplicateIds
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data?.error || 'Failed to apply optimization');
            }

            applyLocalActionResult(action, data.result);
            setActionStatus({ type: 'success', message: data.message || 'Optimization applied successfully.' });
            if (action === 'create_index') {
                setShowSuccessModal(true);
            }
        } catch (err) {
            setActionStatus({ type: 'error', message: err.message || 'Failed to apply optimization.' });
        } finally {
            setActionLoading(false);
        }
    }, [projectid, applyLocalActionResult]);

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
    const missingIndexes = optimizationData && optimizationData.missingIndexes ? optimizationData.missingIndexes : [];
    const highlightedIndex = missingIndexes[0] || null;
    const additionalIndexes = missingIndexes.slice(1);
    const unusedTables = optimizationData && optimizationData.unusedTables ? optimizationData.unusedTables : [];
    const duplicateRecords = optimizationData && optimizationData.duplicateRecords ? optimizationData.duplicateRecords : [];

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
                <div style={{ ...styles.card, borderColor: "#FACC15", color: "#92400E" }}>
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
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Query Performance</h2>
                    <p style={styles.cardDescription}>
                        Average execution time (ms) for different query types
                    </p>
                </div>
                {queryPerformance.length > 0 ? (
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
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={styles.cardDescription}>No recent query activity.</p>
                )}
            </div>

            {/* Missing Index Alert Card */}
            {highlightedIndex ? (
                <div style={styles.cardAlert}>
                    <div style={styles.alertHeader}>
                        <div style={styles.alertIcon}>⚠️</div>
                        <div style={styles.alertTitleContainer}>
                            <h3 style={styles.alertTitle}>
                                Missing Index on '{highlightedIndex.columnName}'
                            </h3>
                            <span style={styles.badgeHigh}>{highlightedIndex.severity || "HIGH"}</span>
                        </div>
                    </div>
                    <p style={styles.alertDescription}>
                        Frequent scans detected on {highlightedIndex.tableName}.{highlightedIndex.columnName}. 
                        Estimated scans: {highlightedIndex.scanCount != null ? highlightedIndex.scanCount : "n/a"}.
                    </p>
                    <div style={styles.cardContent}>
                        <div style={styles.alertBox}>
                            <div style={styles.alertIcon}>💡</div>
                            <div style={styles.alertDetails}>
                                <p style={styles.alertLabel}>Suggestion</p>
                                <code style={styles.sqlCode}>
                                    {highlightedIndex.suggestion || "N/A"}
                                </code>
                            </div>
                        </div>
                        <div style={styles.performanceInsight}>
                            <span style={styles.improvementIcon}>📈</span>
                            <span style={styles.improvementText}>
                                Could improve query performance by up to {highlightedIndex.estimatedImprovement || "60%"}
                            </span>
                        </div>
                    </div>
                    <div style={styles.actionButtons}>
                        <button
                            style={{ ...styles.buttonIgnore, opacity: actionLoading ? 0.7 : 1 }}
                            disabled={actionLoading}
                            onClick={dismissHighlightedIndex}
                        >
                            <span>✕</span> Ignore
                        </button>
                        <button
                            style={{ ...styles.buttonApply, opacity: actionLoading ? 0.7 : 1 }}
                            disabled={actionLoading}
                            onClick={() => handleOptimizationAction({
                                action: 'create_index',
                                targetTable: highlightedIndex.tableName,
                                targetColumn: highlightedIndex.columnName
                            })}
                        >
                            <span>✓</span> Apply Optimization
                        </button>
                    </div>
                </div>
            ) : null}

            {additionalIndexes.length > 0 && (
                <div style={styles.card}>
                    <h2 style={styles.cardTitle}>Other Index Suggestions</h2>
                    <div style={styles.tableContainer}>
                        <table style={styles.dataTable}>
                            <thead style={styles.tableHeader}>
                                <tr>
                                    <th style={styles.tableHeaderCell}>Table</th>
                                    <th style={styles.tableHeaderCell}>Column</th>
                                    <th style={styles.tableHeaderCell}>Scans</th>
                                    <th style={styles.tableHeaderCell}>Improvement</th>
                                </tr>
                            </thead>
                            <tbody>
                                {additionalIndexes.map((item, idx) => (
                                    <tr key={`${item.tableName}-${item.columnName}-${idx}`} style={styles.tableRow}>
                                        <td style={styles.tableCell}>{item.tableName}</td>
                                        <td style={styles.tableCell}>{item.columnName}</td>
                                        <td style={{ ...styles.tableCell, ...styles.centerAlign }}>{item.scanCount != null ? item.scanCount : "–"}</td>
                                        <td style={styles.tableCell}>{item.estimatedImprovement || "60%"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Unused or Empty Tables Card */}
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Unused or Empty Tables</h2>
                    <p style={styles.cardDescription}>
                        These tables have no data or are not being used. You can safely remove them.
                    </p>
                </div>
                <div style={styles.tableContainer}>
                    <table style={styles.dataTable}>
                        <thead style={styles.tableHeader}>
                            <tr>
                                <th style={styles.tableHeaderCell}>Table Name</th>
                                <th style={styles.tableHeaderCell}>Rows</th>
                                <th style={styles.tableHeaderCell}>Last Used</th>
                                <th style={styles.tableHeaderCell}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {unusedTables.length === 0 ? (
                                <tr style={styles.tableRow}>
                                    <td style={styles.tableCell} colSpan={4}>No unused tables detected.</td>
                                </tr>
                            ) : (
                                unusedTables.map((table, idx) => (
                                    <tr key={`${table.tableName}-${idx}`} style={styles.tableRow}>
                                        <td style={styles.tableCell}>{table.tableName}</td>
                                        <td style={{ ...styles.tableCell, ...styles.centerAlign }}>{table.rowCount != null ? table.rowCount : 0}</td>
                                        <td style={styles.tableCell}>{table.lastUsed}</td>
                                        <td style={{ ...styles.tableCell, ...styles.actionCell }}>
                                            <button
                                                style={{ ...styles.actionButton, opacity: actionLoading ? 0.7 : 1 }}
                                                disabled={actionLoading}
                                                onClick={() => handleOptimizationAction({
                                                    action: 'remove_table',
                                                    targetTable: table.tableName
                                                })}
                                            >
                                                Delete Table
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Duplicate Records Card */}
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <h2 style={styles.cardTitle}>Duplicate Records</h2>
                    <p style={styles.cardDescription}>
                        Same data found multiple times in this table. You can clean it with one click.
                    </p>
                </div>
                <div style={styles.tableContainer}>
                    <table style={styles.dataTable}>
                        <thead style={styles.tableHeader}>
                            <tr>
                                <th style={styles.tableHeaderCell}>Table Name</th>
                                <th style={styles.tableHeaderCell}>Duplicate Count</th>
                                <th style={styles.tableHeaderCell}>Suggested Actions</th>
                                <th style={styles.tableHeaderCell}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {duplicateRecords.length === 0 ? (
                                <tr style={styles.tableRow}>
                                    <td style={styles.tableCell} colSpan={4}>No duplicate patterns found.</td>
                                </tr>
                            ) : (
                                duplicateRecords.map((record, idx) => (
                                    <tr key={`${record.tableName}-${record.columnName}-${idx}`} style={styles.tableRow}>
                                        <td style={styles.tableCell}>{record.tableName}</td>
                                        <td style={{ ...styles.tableCell, ...styles.centerAlign }}>
                                            <span style={styles.duplicateBadge}>
                                                {record.duplicateCount} duplicates
                                            </span>
                                        </td>
                                        <td style={styles.tableCell}>{record.suggestedAction || `Review ${record.columnName}`}</td>
                                        <td style={{ ...styles.tableCell, ...styles.actionCell }}>
                                            <button
                                                style={{ ...styles.removeButton, opacity: actionLoading ? 0.7 : 1 }}
                                                disabled={actionLoading}
                                                onClick={() => handleOptimizationAction({
                                                    action: 'remove_duplicates',
                                                    targetTable: record.tableName,
                                                    targetColumn: record.columnName
                                                })}
                                            >
                                                Remove Duplicates
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {showSuccessModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h3 style={styles.modalTitle}>Change Successful</h3>
                        <p>Your optimization has been applied.</p>
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