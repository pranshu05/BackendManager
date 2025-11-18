"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ExportDropdown from "@/components/ui/ExportDropdown";
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  PencilLine,
  Play,
  CheckCircle,
  XCircle,
  SquarePen,
  Loader2,
  Search,
  Funnel,
  Eye,
  Plus,
  FileSignature,
  Trash,
  AlertTriangle,
  Star,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (seconds < 60) return rtf.format(-seconds, "second");
  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (hours < 24) return rtf.format(-hours, "hour");
  if (days < 7) return rtf.format(-days, "day");

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const queryTypes = [
  { label: "All Types", value: "all", icon: Funnel },
  { label: "View Data", value: "SELECT", icon: Eye },
  { label: "Add Data", value: "INSERT", icon: Plus },
  { label: "Edit Data", value: "UPDATE", icon: FileSignature },
  { label: "Delete Data", value: "DELETE", icon: Trash },
  { label: "Other", value: "OTHER", icon: AlertTriangle },
];

const statusTypes = [
  { label: "All Statuses", value: "all" },
  { label: "Success", value: "success", icon: CheckCircle },
  { label: "Failed", value: "error", icon: XCircle },
];

const dateRangeTypes = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "last7days" },
  { label: "Last 30 Days", value: "last30days" },
];

export default function History({ handleSetPage, setQueryToPass }) {
  const params = useParams();
  const projectid = params.slug;

  const [queryHistory, setQueryHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [queryToEdit, setQueryToEdit] = useState(null);
  const [editedSql, setEditedSql] = useState("");
  const [isModalRunning, setIsModalRunning] = useState(false);
  const [modalError, setModalError] = useState("");
  const [historyLimit, setHistoryLimit] = useState(6);
  const [totalQueries, setTotalQueries] = useState(0);
  const [editingTitle, setEditingTitle] = useState({ id: null, text: "" });
  const [runResult, setRunResult] = useState(null);
  const [runResultHeaders, setRunResultHeaders] = useState([]);
  const [runQuerySql, setRunQuerySql] = useState("");
  const [runningQueryId, setRunningQueryId] = useState(null);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [favoritesFilter, setFavoritesFilter] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempStatusFilter, setTempStatusFilter] = useState("all");
  const [tempTypeFilter, setTempTypeFilter] = useState("all");
  const [tempDateRangeFilter, setTempDateRangeFilter] = useState("all");
  const [tempFavoritesFilter, setTempFavoritesFilter] = useState(false);
  const exportOptions = ["XLSX", "CSV", "JSON"];
  const [isExporting, setIsExporting] = useState(false); 
 

  const handleSaveTitle = async () => {
    if (!editingTitle.id) {
      setEditingTitle({ id: null, text: "" });
      return;
    }

    const originalQuery = queryHistory.find((q) => q.id === editingTitle.id);
    const newTitle = editingTitle.text.trim();
    const queryId = editingTitle.id;

    if (!newTitle || originalQuery.title === newTitle) {
      setEditingTitle({ id: null, text: "" });
      return;
    }

    setQueryHistory((prev) =>
      prev.map((q) => (q.id === queryId ? { ...q, title: newTitle } : q))
    );
    setEditingTitle({ id: null, text: "" });

    try {
      const res = await fetch(`/api/projects/${projectid}/history/${queryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naturalLanguageInput: newTitle }),
      });

      if (!res.ok) throw new Error("Failed to save");
    } catch {
      alert("Error saving title. Reverting.");
      setQueryHistory((prev) =>
        prev.map((q) =>
          q.id === queryId ? { ...q, title: originalQuery.title } : q
        )
      );
    }
  };

  const handleToggleFavorite = async (queryId, currentIsFavorite) => {
    const newIsFavorite = !currentIsFavorite;

    setQueryHistory((prev) =>
      prev.map((q) =>
        q.id === queryId ? { ...q, is_favorite: newIsFavorite } : q
      )
    );

    try {
      const res = await fetch(`/api/projects/${projectid}/history/${queryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_favorite: newIsFavorite }),
      });

      if (!res.ok) throw new Error("Failed to update favorite");

      const data = await res.json();

      setQueryHistory((prev) =>
        prev.map((q) =>
          q.id === queryId
            ? { ...q, is_favorite: data.updatedItem.is_favorite }
            : q
        )
      );
    } catch {
      alert("Error updating. Reverting.");
      setQueryHistory((prev) =>
        prev.map((q) =>
          q.id === queryId ? { ...q, is_favorite: currentIsFavorite } : q
        )
      );
    }
  };

  const handleEdit = (query) => {
    setQueryToEdit(query);
    setEditedSql(query.sql);
    setModalError("");
    setIsEditModalOpen(true);
  };

  const handleRerun = async (queryToRerun) => {
    setRunningQueryId(queryToRerun.id);
    setRunResult(null);
    setModalError("");

    const sql = queryToRerun.sql;
    const title = queryToRerun.title;
    const isSelectQuery = sql.trim().toUpperCase().startsWith("SELECT");

    try {
      const res = await fetch(`/api/projects/${projectid}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sql, naturalLanguageInput: title }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to rerun query");
      }

      const resultData = await res.json();

      if (isSelectQuery) {
        const data = resultData.data || [];
        setRunResult(data);
        setRunQuerySql(sql);
        setRunResultHeaders(data.length ? Object.keys(data[0]) : []);
      } else {
        await fetchHistory();
      }
    } catch (err) {
      alert("Error rerunning query: " + err.message);
    } finally {
      setRunningQueryId(null);
    }
  };

  const handleRunEditedQuery = async () => {
    setIsModalRunning(true);
    setModalError("");
    const sql = editedSql; 
    const isSelectQuery = sql.trim().toUpperCase().startsWith("SELECT");
    let newTitle = null; 
    try {
      try {
    // Request the AI service to generate a natural language title
    const titleRes = await fetch(`/api/ai/generate-title/${projectid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sql }),
    });

    if (titleRes.ok) {
        const titleData = await titleRes.json();
        newTitle = titleData.naturalLanguageTitle;
    }
} catch (titleError) {
    console.error("Title generation failed, proceeding without it:", titleError);
    // If AI fails, newTitle stays null so the raw SQL can be shown instead
}
        // query run with new title
        const res = await fetch(`/api/projects/${projectid}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: sql,
          naturalLanguageInput: newTitle, 
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to run edited query");
      }
      const resultData = await res.json();
      if (isSelectQuery) {
        // if  select query then show the result
        const data = resultData.data || [];
        setRunResult(data);
        setRunQuerySql(sql);
        setRunResultHeaders(data.length ? Object.keys(data[0]) : []);
      } else {
        // else only refresh
        await fetchHistory();
      }
      setIsEditModalOpen(false);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setIsModalRunning(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    if (!projectid) return;
    setHistoryLoading(true);

    try {
      const params = new URLSearchParams({
        limit: historyLimit,
        status: statusFilter,
        type: typeFilter,
        dateRange: dateRangeFilter,
      });

      if (favoritesFilter) {
        params.set("favoritesOnly", "true");
      }

      const res = await fetch(
        `/api/projects/${projectid}/history?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed");

      const data = await res.json();

      const formatted = data.history.map((item) => ({
        id: item.id,
        title: item.natural_language_input || item.query_text,
        sql: item.query_text,
        status: item.success ? "success" : "error",
        type: queryTypes.some((qt) => qt.value === item.query_type)
          ? item.query_type
          : "OTHER",
        time: formatTimeAgo(item.created_at),
        result: item.success
          ? `${item.execution_time_ms} ms`
          : item.error_message,
        is_favorite: item.is_favorite,
      }));

      setQueryHistory(formatted);
      setTotalQueries(data.total);
    } catch (err) {
      alert("Error fetching history");
      setQueryHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [
    projectid,
    historyLimit,
    statusFilter,
    typeFilter,
    dateRangeFilter,
    favoritesFilter,
  ]);
  const downloadFile = ({ data, fileName, fileType }) => {
    const blob = new Blob([data], { type: fileType });
    const a = document.createElement("a");
    a.download = fileName;
    a.href = window.URL.createObjectURL(blob);
    const clickEvt = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    a.dispatchEvent(clickEvt);
    a.remove();
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) {
      return "";
    }
    const headers = Object.keys(data[0]);
    const headerRow = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
    
    const rows = data.map(row => {
      return headers.map(header => {
        let value = row[header];
        if (value === null || value === undefined) value = "";
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      }).join(',');
    });
    
    return [headerRow, ...rows].join('\n');
  };
  const handleExportResult = (format) => {
    setIsExporting(true);
    
    const dataToExport = runResult; 
    const fileFormat = format.toLowerCase();
    
    const queryTitle = queryHistory.find(q => q.sql === runQuerySql)?.title || 'query_result';
    const safeTitle = queryTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    const fileName = `dbuddy_result_${safeTitle}.${fileFormat}`;

    try {
      if (!dataToExport || dataToExport.length === 0) {
        alert("No data to export.");
        setIsExporting(false);
        return;
      }
      if (fileFormat === "xlsx") {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(dataToExport);
        XLSX.utils.book_append_sheet(wb, ws, "Result");
        XLSX.writeFile(wb, fileName);

      } else if (fileFormat === "json") {
        const jsonData = JSON.stringify(dataToExport, null, 2);
        downloadFile({
          data: jsonData,
          fileName: fileName,
          fileType: "application/json",
        });
      } else if (fileFormat === "csv") {
        const csvData = convertToCSV(dataToExport);
        downloadFile({
          data: csvData,
          fileName: fileName,
          fileType: "text/csv;charset=utf-8;",
        });
      }
      
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    setHistoryLimit(6);
  }, [statusFilter, typeFilter, dateRangeFilter, favoritesFilter]);

  const handleBackToHistory = () => {
    setRunResult(null);
    setRunQuerySql("");
    setRunResultHeaders([]);
    fetchHistory();
  };

  const handleOpenFilterModal = () => {
    setTempStatusFilter(statusFilter);
    setTempTypeFilter(typeFilter);
    setTempDateRangeFilter(dateRangeFilter);
    setTempFavoritesFilter(favoritesFilter);
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    setStatusFilter(tempStatusFilter);
    setTypeFilter(tempTypeFilter);
    setDateRangeFilter(tempDateRangeFilter);
    setFavoritesFilter(tempFavoritesFilter);
    setIsFilterModalOpen(false);
  };

  const handleClearFilters = () => {
    setTempStatusFilter("all");
    setTempTypeFilter("all");
    setTempDateRangeFilter("all");
    setTempFavoritesFilter(false);
    setStatusFilter("all");
    setTypeFilter("all");
    setDateRangeFilter("all");
    setFavoritesFilter(false);
    setIsFilterModalOpen(false);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (statusFilter !== "all") count++;
    if (typeFilter !== "all") count++;
    if (dateRangeFilter !== "all") count++;
    if (favoritesFilter) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const filteredHistory = queryHistory.filter(
    (q) =>
      q.title.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
      q.sql.toLowerCase().includes(historySearchTerm.toLowerCase())
  );

  return (
    <>
      {runResult ? (
        <div className="p-6">
          <Button
            variant="outline"
            onClick={handleBackToHistory}
            className="mb-4 bg-white shadow-md"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to History
          </Button>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-blue-900">
              Query Result
            </h2>
            <ExportDropdown
              options={exportOptions}
              onSelect={handleExportResult}
              disabled={!runResult || runResult.length === 0 || isExporting}
              isLoading={isExporting}
              className="bg-white shadow-sm"
            />
          </div>
          <code className="block bg-gray-100 text-gray-800 p-2 rounded-md text-sm mb-4">
            {runQuerySql}
          </code>

          <div className="w-full overflow-x-auto p-1 bg-white shadow-md rounded-xl border">
            <table className="min-w-max w-full table-auto">
              <thead>
                <tr>
                  {runResultHeaders.map((header) => (
                    <th key={header} className="px-4 py-2 border-b">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runResult.length > 0 ? (
                  runResult.map((row, i) => (
                    <tr key={i} className="border-b">
                      {runResultHeaders.map((header) => (
                        <td key={header} className="px-4 py-2 text-center">
                          {String(row[header] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={runResultHeaders.length || 1}
                      className="text-center py-4 text-gray-500"
                    >
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-6">
          <h2 className="text-2xl font-semibold mb-6 text-blue-900">
            Query History
          </h2>

          <div className="flex justify-center items-center gap-4 mb-6">
            <div className="relative w-full max-w-md">
              <Input
                type="text"
                placeholder="Search history (title or SQL)..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                className="pl-10 bg-white shadow-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>

            <Button
              variant="outline"
              onClick={handleOpenFilterModal}
              className="bg-white shadow-sm relative"
            >
              <Funnel className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Filter History</DialogTitle>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                <div>
                  <h4 className="font-medium mb-3">General</h4>
                  <Button
                    variant={tempFavoritesFilter ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setTempFavoritesFilter(!tempFavoritesFilter)
                    }
                    className="flex items-center gap-1.5"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        tempFavoritesFilter ? "text-yellow-300" : ""
                      }`}
                    />
                    Show Favorites Only
                  </Button>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Date Range</h4>
                  <div className="flex flex-wrap gap-2">
                    {dateRangeTypes.map((range) => (
                      <Button
                        key={range.value}
                        variant={
                          tempDateRangeFilter === range.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setTempDateRangeFilter(range.value)}
                      >
                        {range.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {statusTypes.map((status) => (
                      <Button
                        key={status.value}
                        variant={
                          tempStatusFilter === status.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setTempStatusFilter(status.value)}
                        className="flex items-center gap-1.5"
                      >
                        {status.icon && <status.icon className="w-4 h-4" />}
                        {status.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Query Type</h4>
                  <div className="flex flex-wrap gap-2">
                    {queryTypes.map((type) => (
                      <Button
                        key={type.value}
                        variant={
                          tempTypeFilter === type.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setTempTypeFilter(type.value)}
                        className="flex items-center gap-1.5"
                      >
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="flex justify-between">
                <Button variant="ghost" onClick={handleClearFilters}>
                  Clear All
                </Button>

                <div className="flex gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleApplyFilters}>Apply</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>Edit Query</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-4">
                <Textarea
                  className="w-full h-48 p-2 border rounded-md font-mono"
                  value={editedSql}
                  onChange={(e) => setEditedSql(e.target.value)}
                />

                {modalError && (
                  <div className="p-2 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm">
                    Error: {modalError}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isModalRunning}
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleRunEditedQuery}
                  disabled={isModalRunning}
                >
                  {isModalRunning ? "Running..." : "Run Edited Query"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {historyLoading ? (
            <div className="text-center py-12">Loading history...</div>
          ) : queryHistory.length === 0 &&
            historySearchTerm === "" &&
            activeFilterCount === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No query history found.
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="font-medium">No results found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredHistory.map((query) => {
                const TypeIcon =
                  queryTypes.find((qt) => qt.value === query.type)?.icon ||
                  AlertTriangle;

                return (
                  <div
                    key={query.id}
                    className="bg-white shadow-md rounded-xl p-4 border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className={
                            query.status === "success"
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          {query.status === "success" ? (
                            <CheckCircle size={18} />
                          ) : (
                            <XCircle size={18} />
                          )}
                        </span>

                        <TypeIcon className="w-4 h-4 text-gray-500" />

                        {editingTitle.id === query.id ? (
                          <input
                            type="text"
                            value={editingTitle.text}
                            onChange={(e) =>
                              setEditingTitle({
                                ...editingTitle,
                                text: e.target.value,
                              })
                            }
                            onBlur={handleSaveTitle}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveTitle();
                              if (e.key === "Escape")
                                setEditingTitle({ id: null, text: "" });
                            }}
                            className="font-medium text-gray-800 p-1 border border-blue-500 rounded w-full"
                            autoFocus
                          />
                        ) : (
                          <>
                            <p
                              className="font-medium text-gray-800 truncate"
                              title={query.title}
                              onClick={() => {
                                setQueryToPass(query.title);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setQueryToPass(query.title);
                                  handleSetPage("query");
                                }
                              }}
                            >
                              {query.title}
                            </p>

                            <button
                              onClick={() => {
                                setQueryToPass(query.title);
                                handleSetPage("query");
                              }}
                              className="text-gray-400 hover:text-gray-600"
                              title="Open in Query"
                            >
                              <SquarePen size={14} />
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex gap-3 text-gray-500 pl-4">
                        <button
                          onClick={() =>
                            handleToggleFavorite(query.id, query.is_favorite)
                          }
                          className="hover:text-yellow-500 disabled:opacity-50"
                          title={
                            query.is_favorite
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                          disabled={runningQueryId !== null}
                        >
                          <Star
                            size={16}
                            className={
                              query.is_favorite
                                ? "fill-yellow-400 text-yellow-500"
                                : "text-gray-400 hover:text-gray-800"
                            }
                          />
                        </button>

                        <button
                          onClick={() => handleRerun(query)}
                          className="hover:text-gray-800 disabled:opacity-50"
                          title="Rerun query"
                          disabled={runningQueryId !== null}
                        >
                          {runningQueryId === query.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Play size={16} />
                          )}
                        </button>

                        <button
                          onClick={() => handleEdit(query)}
                          className="hover:text-gray-800 disabled:opacity-50"
                          title="Edit query in new window"
                          disabled={runningQueryId !== null}
                        >
                          <PencilLine size={16} />
                        </button>
                      </div>
                    </div>

                    <code className="block bg-gray-100 p-2 rounded-md text-sm mb-2">
                      {query.sql}
                    </code>

                    {query.status === "error" && (
                      <p className="text-sm text-red-500 mb-2">
                        {query.result}
                      </p>
                    )}

                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{query.time}</span>
                      {query.status === "success" && (
                        <span>{query.result}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!historyLoading &&
            queryHistory.length > 0 &&
            queryHistory.length < totalQueries && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => setHistoryLimit(99999)}
                  variant="outline"
                  className="bg-white shadow-md"
                >
                  Load All Previous ({totalQueries - queryHistory.length} more)
                </Button>
              </div>
            )}
        </div>
      )}
    </>
  );
}
