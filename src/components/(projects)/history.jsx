"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  PencilLine,
  Play,
  CheckCircle,
  XCircle,
  SquarePen,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Formats timestamps like "2 days ago"
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (seconds < 60) {
    return rtf.format(-seconds, "second");
  } else if (minutes < 60) {
    return rtf.format(-minutes, "minute");
  } else if (hours < 24) {
    return rtf.format(-hours, "hour");
  } else if (days < 7) {
    return rtf.format(-days, "day");
  } else {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
}

export default function History({
  safeJsonFetch,
  showNotification,
  showConfirm,
  handleSetPage,
  setQueryToPass,
}) {
  const params = useParams();
  const projectid = params.slug;

  // --- History States ---
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

  // --- Query Result States ---
  const [runResult, setRunResult] = useState(null); // Result data
  const [runResultHeaders, setRunResultHeaders] = useState([]); // Result table headers
  const [runQuerySql, setRunQuerySql] = useState(""); // The SQL that was run
  const [runningQueryId, setRunningQueryId] = useState(null); // ID of the query being run

  // --- History Functions ---
  const handleSaveTitle = async () => {
    if (!editingTitle.id || !editingTitle.text.trim()) {
      setEditingTitle({ id: null, text: "" });
      return;
    }
    const originalQuery = queryHistory.find((q) => q.id === editingTitle.id);
    const newTitle = editingTitle.text.trim();
    const queryId = editingTitle.id;
    if (originalQuery.title === newTitle) {
      setEditingTitle({ id: null, text: "" });
      return;
    }
    setQueryHistory((prevHistory) =>
      prevHistory.map((q) => (q.id === queryId ? { ...q, title: newTitle } : q))
    );
    setEditingTitle({ id: null, text: "" });
    try {
      // Use safeJsonFetch prop
      await safeJsonFetch(`/api/projects/${projectid}/history/${queryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naturalLanguageInput: newTitle }),
      });
      showNotification("Title saved successfully", "success");
    } catch (err) {
      console.error("Error saving title:", err);
      showNotification("Error saving title. Reverting.", "error");
      setQueryHistory((prevHistory) =>
        prevHistory.map((q) =>
          q.id === queryId ? { ...q, title: originalQuery.title } : q
        )
      );
    }
  };

  const handleEdit = (query) => {
    console.log("Editing query:", query.sql);
    setQueryToEdit(query);
    setEditedSql(query.sql);
    setModalError("");
    setIsEditModalOpen(true);
  };

  const handleRerun = async (queryToRerun) => {
    console.log("Rerunning query from history:", queryToRerun.sql);
    setRunningQueryId(queryToRerun.id);
    setRunResult(null);
    setModalError("");

    const sql = queryToRerun.sql;
    const title = queryToRerun.title;
    const isSelectQuery = sql.trim().toUpperCase().startsWith("SELECT");

    try {
      // Use safeJsonFetch prop
      const resultData = await safeJsonFetch(`/api/projects/${projectid}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: sql,
          naturalLanguageInput: title,
        }),
      });

      if (isSelectQuery) {
        const data = resultData.data || [];
        setRunResult(data);
        setRunQuerySql(sql);

        if (data.length > 0) {
          setRunResultHeaders(Object.keys(data[0]));
        } else {
          setRunResultHeaders([]);
        }
      } else {
        showNotification("Query run successfully", "success");
        await fetchHistory();
      }
    } catch (err) {
      console.error("Error rerunning query:", err);
      showNotification(`Error rerunning query: ${err.message}`, "error");
    } finally {
      setRunningQueryId(null);
    }
  };

  const handleRunEditedQuery = async () => {
    setIsModalRunning(true);
    setModalError("");
    try {
      // Use safeJsonFetch prop
      await safeJsonFetch(`/api/projects/${projectid}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: editedSql,
          naturalLanguageInput: queryToEdit?.title,
        }),
      });
      await fetchHistory();
      setIsEditModalOpen(false);
      showNotification("Edited query run successfully", "success");
    } catch (err) {
      console.error("Error running edited query:", err);
      setModalError(err.message);
    } finally {
      setIsModalRunning(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    if (!projectid) return;
    
    setHistoryLoading(true);
    try {
      // Use safeJsonFetch prop
      const data = await safeJsonFetch(
        `/api/projects/${projectid}/history?limit=${historyLimit}`
      );
      
      const formattedHistory = data.history.map((item) => ({
        id: item.id,
        title: item.natural_language_input || item.query_text,
        sql: item.query_text,
        status: item.success ? "success" : "error",
        time: formatTimeAgo(item.created_at),
        result: item.success
          ? `${item.execution_time_ms} ms`
          : item.error_message,
      }));
      setQueryHistory(formattedHistory);
      setTotalQueries(data.total);
    } catch (err) {
      console.error("Error fetching query history:", err);
      showNotification("Error fetching query history: " + (err?.message || err), "error");
      setQueryHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [projectid, historyLimit, safeJsonFetch, showNotification]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleBackToHistory = () => {
    setRunResult(null);
    setRunQuerySql("");
    setRunResultHeaders([]);
    fetchHistory();
  };

  return (
    <>
      {runResult ? (
        // --- Result View ---
        <div className="p-6">
          <Button
            variant="outline"
            onClick={handleBackToHistory}
            className="mb-4 bg-white shadow-md"
          >
            <ArrowLeft size={16} className="mr-2" />
            Back to History
          </Button>
          <h2 className="text-2xl font-semibold mb-4 text-blue-900">
            Query Result
          </h2>
          <code className="block bg-gray-100 text-gray-800 p-2 rounded-md text-sm mb-4">
            {runQuerySql}
          </code>
          <div className="w-full overflow-x-auto max-w-full overflow-y-auto h-fit p-1 bg-white shadow-md rounded-xl border">
            <table className="min-w-max w-full table-auto">
              <thead className="tb_head">
                <tr>
                  {runResultHeaders.map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2 border-b whitespace-nowrap"
                    >
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
                        <td
                          key={header}
                          className="px-4 py-2 text-center whitespace-nowrap"
                        >
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
        // --- History List View ---
        <div className="p-6 ">
          <h2 className="text-2xl font-semibold mb-6 text-blue-900">
            Query History
          </h2>
          <Dialog
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
          >
            <DialogContent className="sm:max-w-[600px] bg-white">
              <DialogHeader>
                <DialogTitle>Edit Query</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <Textarea
                  className="w-full h-48 p-2 border rounded-md font-mono bg-white"
                  value={editedSql}
                  onChange={(e) => setEditedSql(e.target.value)}
                />
                {modalError && (
                  <div className="p-2 bg-red-100 text-red-700 border border-red-300 rounded-md text-sm">
                    <strong>Error:</strong> {modalError}
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
          ) : queryHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No query history found.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {queryHistory.map((query) => (
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
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveTitle();
                            }
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
                          >
                            {query.title}
                          </p>
                          <button
                            onClick={() => {
                              console.log("Passing title to query page:", query.title);
                              setQueryToPass(query.title); // Set the TITLE
                              handleSetPage("query"); // Switch to query page
                            }}
                            className="hover:text-gray-800 ml-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                            title="Edit Title in Query Page"
                          >
                            <SquarePen size={14} />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex gap-3 text-gray-500 pl-4 flex-shrink-0">
                      <button
                        onClick={() => handleRerun(query)}
                        className="hover:text-gray-800 disabled:opacity-50 disabled:cursor-wait"
                        title="Rerun Query"
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
                        title="Edit SQL Query"
                        disabled={runningQueryId !== null}
                      >
                        <PencilLine size={16} />
                      </button>
                    </div>
                  </div>
                  <code className="block bg-gray-100 text-gray-800 p-2 rounded-md text-sm mb-2">
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
              ))}
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
                  Load All Previous ({totalQueries - queryHistory.length}{" "}
                  more)
                </Button>
              </div>
            )}
        </div>
      )}
    </>
  );
}