"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/ui/header";
import Sidebar from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/ui/dropdown";
import ExportDropdown from "@/components/ui/ExportDropdown";
import SchemaPage from "@/components/(projects)/schema";
import Optimization from "@/components/(projects)/optimization";
import Query from "@/components/(projects)/query";
import MockDataGenerator from "@/components/(dashboard)/MockDataGenerator";
import SummaryCard from "@/components/(projects)/summary_card";
import History from "@/components/(projects)/history";

import {
  ArrowLeft,
  Database,
  Funnel,
  Trash,
  Sparkles,
} from "lucide-react";

export default function DashboardPage() {
  const params = useParams();
  const projectid = params.slug;

  const [projects, setProjects] = useState([]);
  const [projectdetail, setprojectdetail] = useState({});
  const [page, setpage] = useState("table");

  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tablelist, settablelist] = useState([]);
  const [loading, setLoading] = useState(false);

  const [limit] = useState(5);
  const [isExpanded, setIsExpanded] = useState(false);

  const [editingCell, setEditingCell] = useState(null);
  const [editedvalue, seteditedvalue] = useState("");

  const [deletebtn, setdeletebtn] = useState(false);
  const [deleteRows, setdeleteRows] = useState([]);

  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions] = useState(["PDF", "CSV", "JSON"]);

  const [showSummary, setShowSummary] = useState(false);

  // Used to pass a selected query from history to query editor
  const [queryToPass, setQueryToPass] = useState(null);

  const handleSetPage = (newPage) => {
    setpage(newPage);
  };

  /* Exports the selected table into PDF, CSV, or JSON */
  const handleExport = async (format) => {
    setIsExporting(true);

    try {
      const res = await fetch(
        `/api/projects/${projectid}/export?format=${format.toLowerCase()}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const disposition = res.headers.get("Content-Disposition");
      const a = document.createElement("a");
      a.href = url;

      if (disposition?.includes("filename=")) {
        const match = disposition.match(/filename="(.+)"/);
        a.download = match ? match[1] : "export";
      } else {
        a.download = `${projectdetail.project_name}_${format}`;
      }

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  /* Loads all projects from database */
  useEffect(() => {
    const fetchProjectsData = async () => {
      try {
        const res = await fetch("/api/projects", { cache: "no-store" });
        if (!res.ok) return setProjects([]);

        const data = await res.json();
        setProjects(data.projects || []);
      } catch {
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectsData();
  }, []);

  /* Select current project from project list */
  useEffect(() => {
    if (projects.length > 0) {
      const proj = projects.find((p) => String(p.id) === String(projectid));
      if (proj) setprojectdetail(proj);
    }
  }, [projects]);

  /* Reset selected rows when table changes */
  useEffect(() => {
    setdeleteRows([]);
  }, [selectedTable]);

  /* Opens the input box when user clicks on a cell */
  const handleCellClick = (rowIndex, colName, value) => {
    setEditingCell({ rowIndex, colName, value });
    seteditedvalue(String(value ?? ""));
  };

  /* Deletes selected rows based on primary key */
  const handledelete = async () => {
    if (deleteRows.length === 0) return alert("No rows selected");

    const proceed = window.confirm(
      `Delete ${deleteRows.length} rows permanently?`
    );
    if (!proceed) return;

    try {
      const pkcols = tableData.columns
        .filter((c) => c.constraint === "PRIMARY KEY")
        .map((c) => c.name);

      const pkValuesArray = deleteRows.map((rowObj) => {
        const obj = {};
        pkcols.forEach((col) => (obj[col] = rowObj[col]));
        return obj;
      });

      const payload = {
        projectId: projectid,
        table: selectedTable,
        pkcols,
        pkvalues: pkValuesArray,
      };

      const res = await fetch(`/api/projects/${projectid}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) return alert(result.error);

      alert(`Deleted ${deleteRows.length} rows`);

      setdeleteRows([]);

      setTableData((prev) => {
        const updated = prev.rows.filter((row) => {
          return !deleteRows.some((dr) =>
            pkcols.every((col) => dr[col] === row[col])
          );
        });
        return { ...prev, rows: updated };
      });
    } catch (err) {
      alert(err.message);
    }
  };

  /* Saves edited cell when pressing Enter */
  const handleCellKeyDown = (e) => {
    if (e.key === "Escape") return setEditingCell(null);
    if (e.key !== "Enter") return;

    e.preventDefault();

    if (!editingCell || editedvalue === editingCell.value)
      return setEditingCell(null);

    const ok = window.confirm(
      `Update value?\nFrom: ${editingCell.value}\nTo: ${editedvalue}`
    );
    if (!ok) return setEditingCell(null);

    if (editedvalue.trim() === "") return alert("Value cannot be empty");

    (async () => {
      try {
        const pkCol =
          tableData.columns.find((c) => c.constraint === "PRIMARY KEY")?.name ||
          tableData.columns[0].name;

        const currentRow = tableData.rows[editingCell.rowIndex];

        const payload = {
          table: selectedTable,
          pkColumn: pkCol,
          pkValue: currentRow[pkCol],
          column: editingCell.colName,
          newValue: editedvalue.trim(),
          oldValue: editingCell.value,
        };

        const res = await fetch(`/api/projects/${projectid}/update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = await res.json();
        if (!res.ok) return alert(result.error);

        setTableData((prev) => {
          const updatedRows = prev.rows.map((row, idx) =>
            idx === editingCell.rowIndex ? result.row : row
          );
          return { ...prev, rows: updatedRows };
        });
      } catch {
        alert("Update failed");
      } finally {
        setEditingCell(null);
      }
    })();
  };

  /* Loads all table names of the project */
  const fetchTables = async () => {
    try {
      const res = await fetch(`/api/projects/${projectid}/tables`);
      const data = await res.json();
      if (!res.ok) return;

      const names = data.tables.map((t) => t.name);
      settablelist(names);

      if (names.length > 0) {
        setSelectedTable(names[0]);
        fetchtabledata(names[0]);
      }
    } catch {}
  };

  useEffect(() => {
    if (projectid) fetchTables();
  }, [projectid]);

  /* Loads rows + columns of a selected table */
  const fetchtabledata = async (tablename, recordLimit = limit) => {
    setLoading(true);
    try {
      const params = `table=${tablename}${recordLimit ? `&limit=${recordLimit}` : ""}`;

      const res = await fetch(`/api/projects/${projectid}/tables?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTableData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      <Header />

      {/* Page Header */}
      <div 
        className="db w-full flex items-center h-26 gap-4 px-6"
        style={{ background: "var(--panel-bg)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="db_left flex items-center">
          <ArrowLeft
            className="cursor-pointer"
            onClick={() => (globalThis.location.href = "/dashboard")}
            style={{ color: "var(--text)" }}
          />
        </div>

        <div className="db_right w-full flex gap-2">
          <div className="db_icon flex items-center">
            <div 
              className="p-2 rounded-xl w-12 h-12 flex items-center justify-center"
              style={{ background: "var(--accent)" }}
            >
              <Database style={{ color: "var(--primary)" }} />
            </div>
          </div>

          <div className="details flex flex-col justify-center">
            <span className="text-xs md:text-xl" style={{ color: "var(--text)" }}>{projectdetail.project_name}</span>
            <span className="text-xs md:text-sm" style={{ color: "var(--muted-text)" }}>
              {projectdetail.description}
            </span>
            <span className="text-xs" style={{ color: "var(--muted-text)" }}>
              📊 {projectdetail.table_count} Tables
            </span>
          </div>

          <div className="ml-auto flex items-center">
            <Button onClick={() => setShowSummary(true)} className="generate-btn">
              <Sparkles className="w-4 h-4 mr-1" />
              Summary
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="content flex flex-row w-full flex-1 min-h-0">
        <Sidebar active={page} onSelectPage={(p) => setpage(p)} />

        <div className="rightcontent flex flex-col w-full overflow-y-scroll h-screen">

          {/* ---------------- TABLE PAGE ---------------- */}
          {page === "table" && (
            <>
              <div 
                className="table_select h-14 flex items-center p-4 gap-2"
                style={{ 
                  background: "var(--panel-bg)",
                  borderBottom: "1px solid var(--border)"
                }}
              >
                <span style={{ color: "var(--muted-text)" }}>Table Explorer</span>
                <Dropdown
                  items={tablelist}
                  selected={selectedTable}
                  onSelect={(t) => {
                    setSelectedTable(t);
                    fetchtabledata(t);
                    setIsExpanded(false);
                  }}
                />
              </div>

              <div 
                className="filter h-23 flex items-center p-4 gap-4"
                style={{ 
                  background: "var(--panel-bg)",
                  borderBottom: "1px solid var(--border)"
                }}
              >
                <Funnel style={{ color: "var(--text)" }} />
                <span style={{ color: "var(--text)" }}>Filters:</span>
              </div>

              {/* Buttons */}
              <div 
                className="mockbutton p-4 flex flex-col gap-3 min-[820]:flex-row justify-between"
                style={{ 
                  background: "var(--panel-bg)",
                  borderBottom: "1px solid var(--border)"
                }}
              >
                <div className="frontbtn flex gap-2">
                  <Button>+ Insert Row</Button>

                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (deletebtn) await handledelete();
                      setdeletebtn(!deletebtn);
                    }}
                    style={{
                      background: "var(--accent)",
                      borderColor: "var(--border)",
                      color: "var(--text)"
                    }}
                  >
                    <Trash />
                    {!deletebtn ? "Delete" : `Selected: ${deleteRows.length}`}
                  </Button>
                </div>

                <div className="endbtn flex gap-4">
                  <MockDataGenerator
                    projectId={projectid}
                    onSuccess={() => selectedTable && fetchtabledata(selectedTable)}
                  />

                  <ExportDropdown
                    options={exportOptions}
                    onSelect={handleExport}
                    disabled={!selectedTable || !tableData || tableData.rows.length === 0}
                    isLoading={isExporting}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 min-h-0 flex flex-col">
                {loading ? (
                  <div style={{ color: "var(--muted-text)", padding: "2rem", textAlign: "center" }}>Loading table...</div>
                ) : tableData ? (
                  <div className="w-full overflow-x-auto">
                    <table className="min-w-max w-full table-auto">
                      <thead>
                        <tr style={{ background: "var(--accent)", borderColor: "var(--border)" }}>
                          {deletebtn && (
                            <th 
                              className="px-4 py-2 border-b"
                              style={{ 
                                color: "var(--text)",
                                borderColor: "var(--border)"
                              }}
                            ></th>
                          )}
                          {tableData.columns.map((col) => (
                            <th 
                              key={col.name} 
                              className="px-4 py-2 border-b"
                              style={{ 
                                color: "var(--text)",
                                borderColor: "var(--border)"
                              }}
                            >
                              {col.name}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {tableData.rows.length > 0 ? (
                          tableData.rows.map((row, i) => (
                            <tr key={i} style={{ borderColor: "var(--border)" }}>
                              {deletebtn && (
                                <td 
                                  className="px-4 py-2 text-center"
                                  style={{ borderColor: "var(--border)" }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={deleteRows.some((dr) =>
                                      tableData.columns
                                        .filter((c) => c.constraint === "PRIMARY KEY")
                                        .every((pk) => dr[pk.name] === row[pk.name])
                                    )}
                                    onChange={(e) => {
                                      const pkCols = tableData.columns.filter(
                                        (c) => c.constraint === "PRIMARY KEY"
                                      );

                                      const pkValues = {};
                                      pkCols.forEach((c) => (pkValues[c.name] = row[c.name]));

                                      if (e.target.checked) {
                                        setdeleteRows((prev) => [...prev, pkValues]);
                                      } else {
                                        setdeleteRows((prev) =>
                                          prev.filter((val) =>
                                            !pkCols.every(
                                              (c) => val[c.name] === row[c.name]
                                            )
                                          )
                                        );
                                      }
                                    }}
                                    style={{
                                      accentColor: "var(--primary)"
                                    }}
                                  />
                                </td>
                              )}

                              {tableData.columns.map((col) => (
                                <td
                                  key={col.name}
                                  className={`px-4 py-2 text-center cursor-pointer ${
                                    editingCell?.rowIndex === i &&
                                    editingCell?.colName === col.name
                                      ? "ring-2"
                                      : ""
                                  }`}
                                  style={{
                                    color: "var(--text)",
                                    borderColor: "var(--border)",
                                    ...(editingCell?.rowIndex === i &&
                                    editingCell?.colName === col.name
                                      ? { ringColor: "var(--primary)", ringOpacity: 0.5 }
                                      : {})
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!(editingCell?.rowIndex === i && editingCell?.colName === col.name)) {
                                      e.currentTarget.style.background = "var(--accent)";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!(editingCell?.rowIndex === i && editingCell?.colName === col.name)) {
                                      e.currentTarget.style.background = "transparent";
                                    }
                                  }}
                                  onClick={() =>
                                    handleCellClick(i, col.name, row[col.name])
                                  }
                                >
                                  {editingCell?.rowIndex === i &&
                                  editingCell?.colName === col.name ? (
                                    <input
                                      type="text"
                                      value={editedvalue}
                                      className="w-full text-center"
                                      style={{
                                        background: "var(--panel-bg)",
                                        color: "var(--text)",
                                        borderColor: "var(--border)"
                                      }}
                                      onChange={(e) => seteditedvalue(e.target.value)}
                                      onKeyDown={handleCellKeyDown}
                                      autoFocus
                                    />
                                  ) : (
                                    String(row[col.name] ?? "")
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td 
                              colSpan={tableData.columns.length} 
                              className="text-center py-4"
                              style={{ color: "var(--muted-text)" }}
                            >
                              No records found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: "var(--muted-text)", textAlign: "center", padding: "2rem" }}>No table selected</div>
                )}

                {!isExpanded &&
                  tableData &&
                  tableData.rows.length === limit && (
                    <div className="flex justify-center mt-3">
                      <Button
                        onClick={() => {
                          setIsExpanded(true);
                          fetchtabledata(selectedTable, null);
                        }}
                      >
                        Load More
                      </Button>
                    </div>
                  )}
              </div>
            </>
          )}

          {/* ---------------- QUERY PAGE ---------------- */}
          {page === "query" && (
            <Query initialQuery={queryToPass} onQueryMounted={() => setQueryToPass(null)} />
          )}

          {/* ---------------- HISTORY PAGE ---------------- */}
          {page === "history" && (
            <History handleSetPage={handleSetPage} setQueryToPass={setQueryToPass} />
          )}

          {/* ---------------- OPTIMIZATION PAGE ---------------- */}
          {page === "optimization" && <Optimization />}

          {/* ---------------- SCHEMA PAGE ---------------- */}
          {page === "schema" && <SchemaPage />}
        </div>
      </div>

      {showSummary && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <SummaryCard projectId={projectid} onClose={() => setShowSummary(false)} />
        </div>
      )}
    </div>
  );
}
