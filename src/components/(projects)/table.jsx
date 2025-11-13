"use client";

import { useState, useEffect, useCallback }from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/ui/dropdown";
import ExportDropdown from "@/components/ui/ExportDropdown";
import { Trash, Sparkles } from "lucide-react";

// This component now receives shared functions as props
export default function TableExplorer({ safeJsonFetch, showNotification, showConfirm }) {
  const params = useParams();
  const projectid = params.slug;

  // --- Table Explorer States ---
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tablelist, settablelist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadtable, setloadtable] = useState(false);
  const [limit] = useState(5);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editedvalue, seteditedvalue] = useState("");
  const [deletebtn, setdeletebtn] = useState(false);
  const [deleteRows, setdeleteRows] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions] = useState(["XLSX", "CSV", "JSON"]);

  // --- Table Explorer Functions ---
  const handleExport = async (format) => {
    console.log("Export Request for project:", projectid, "in format:", format);
    if (!selectedTable) {
      showNotification("Please select a table to export", "error");
      return;
    }

    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectid}/export?format=${format.toLowerCase()}&table=${encodeURIComponent(
          selectedTable
        )}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to export data");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const disposition = res.headers.get("Content-Disposition");
      const a = document.createElement("a");
      a.href = url;

      if (disposition && disposition.includes("filename=")) {
        const filenameMatch = disposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          a.download = filenameMatch[1];
        } else {
          a.download = `${selectedTable.replace(
            /[^a-z0-9]/gi,
            "_"
          )}.${format.toLowerCase()}`;
        }
      } else {
        a.download = `${selectedTable.replace(
          /[^a-z0-9]/gi,
          "_"
        )}.${format.toLowerCase()}`;
      }

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      showNotification(`Exported ${selectedTable} as ${format}`, "success");
    } catch (error) {
      console.error("Export error:", error);
      showNotification(error.message || "Failed to export data", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCellClick = (rowIndex, colName, value) => {
    setEditingCell({ rowIndex, colName, value });
    seteditedvalue(String(value ?? ""));
  };

  const handledelete = async (e) => {
    if (deleteRows.length === 0) {
      showNotification("No rows selected for deletion", "error");
      return;
    }

    showConfirm({
        title: `Delete ${deleteRows.length} row(s)?`,
        message: "Are you sure you want to delete the selected rows? This action cannot be undone.",
        isDestructive: true,
        onConfirm: async () => {
            try {
                const pkcolarray = [];
                tableData.columns.forEach((col) => {
                    if (col.constraint === "PRIMARY KEY") {
                    pkcolarray.push(col.name);
                    }
                });
                const pkValuesArray = deleteRows.map((rowObj) => {
                    const pkVals = {};
                    pkcolarray.forEach((colName) => {
                    pkVals[colName] = rowObj[colName];
                    });
                    return pkVals;
                });
                const payload = {
                    projectId: projectid,
                    table: selectedTable || tableData.table,
                    pkcols: pkcolarray,
                    pkvalues: pkValuesArray,
                };
                
                // Use safeJsonFetch prop
                await safeJsonFetch(`/api/projects/${projectid}/delete`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                showNotification(`Successfully deleted ${deleteRows.length} rows.`, "success");
                
                setTableData((prev) => {
                    if (!prev) return prev;
                    const filteredRows = prev.rows.filter((row) => {
                    return !deleteRows.some((dr) => {
                        return pkcolarray.every((colName) => {
                        return row[colName] === dr[colName];
                        });
                    });
                    });
                    return { ...prev, rows: filteredRows };
                });
                setdeleteRows([]);

            } catch (err) {
                showNotification("Error deleting rows: " + (err?.message || err), "error");
            }
        }
    });
  };

  const handleCellKeyDown = (e) => {
    if (e.key === "Escape") {
        setEditingCell(null);
        return;
    }
    
    if (e.key === "Enter") {
      e.preventDefault();
      if (!editingCell || editedvalue === editingCell.value) {
        setEditingCell(null);
        return;
      }
      if (String(editedvalue).trim() === "") {
        showNotification("Value cannot be empty", "error");
        return;
      }

      showConfirm({
        title: "Confirm Update",
        message: `Are you sure you want to update this value?\nFrom: ${editingCell.value}\nTo: ${editedvalue}`,
        onConfirm: async () => {
            try {
                const pkCol =
                tableData?.columns?.find((c) => c.constraint === "PRIMARY KEY")
                    ?.name || tableData?.columns?.[0]?.name;
                const row = tableData.rows[editingCell.rowIndex];
                const payload = {
                table: selectedTable || tableData.table,
                pkColumn: pkCol,
                pkValue: row[pkCol],
                column: editingCell.colName,
                newValue: String(editedvalue).trim(),
                oldValue: editingCell.value,
                };

                // Use safeJsonFetch prop
                const result = await safeJsonFetch(`/api/projects/${projectid}/update`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const updatedRow = result.row;
                setTableData((prev) => {
                    if (!prev) return prev;
                    const rows = prev.rows.map((r, idx) => {
                    if (idx !== editingCell.rowIndex) return r;
                    return updatedRow;
                    });
                    return { ...prev, rows };
                });
                showNotification("Value updated successfully", "success");
            } catch (err) {
                showNotification("Error updating value: " + (err?.message || err), "error");
            } finally {
                setEditingCell(null);
            }
        },
        onCancel: () => setEditingCell(null)
      });
    }
  };

  const fetchTables = useCallback(async () => {
    try {
      // Use safeJsonFetch prop
      const data = await safeJsonFetch(`/api/projects/${projectid}/tables`, {
        credentials: "include",
      });
      
      console.log("Fetched tables: ", data);
      const names = data.tables.map((t) => t.name);
      settablelist(names);
      if (names.length > 0) {
        setSelectedTable(names[0]);
        fetchtabledata(names[0]);
      }
    } catch (err) {
      showNotification("Error fetching tables: " + (err?.message || err), "error");
    }
  }, [projectid, safeJsonFetch, showNotification]); // Added dependencies

  const fetchtabledata = async (tablename, recordLimit = limit) => {
    setLoading(true);
    try {
      const params = `table=${encodeURIComponent(tablename)}${
        recordLimit ? `&limit=${recordLimit}` : ""
      }`;
      // Use safeJsonFetch prop
      const data = await safeJsonFetch(`/api/projects/${projectid}/tables?${params}`, {
        credentials: "include",
      });
      setTableData(data);
      setloadtable(false);
    } catch (err) {
      showNotification("Error fetching table data: " + (err?.message || err), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setdeleteRows([]);
  }, [selectedTable]);
  
  useEffect(() => {
    if (projectid) fetchTables();
  }, [projectid, fetchTables]); // Use fetchTables as dependency


  return (
    <>
      <div className="table_select h-14 flex flex-row items-center bg-white sm:p-4 gap-2 max-[510]:flex-col max-[510]:h-25">
        Table Explorer
        <Dropdown
          items={tablelist}
          selected={selectedTable}
          onSelect={(t) => {
            setSelectedTable(t);
            fetchtabledata(t);
            setIsExpanded(false);
            setloadtable(true);
          }}
        />
      </div>
      <div className="mockbutton h-28 gap-2 bg-white items-center flex-col max-[510]:h-65 min-[820]:flex-row min-[820]:h-19 flex p-4 justify-between">
        <div className="frontbtn flex flex-row gap-2 max-[510]:flex-col max-[510]:w-full max-[510]:gap-3">
          <Button className=" max-[510]:w-full hover:cursor-pointer">
            + Insert Row
          </Button>
          <Button
            className="text-black bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer"
            onClick={async () => {
              if (deletebtn) {
                await handledelete();
              }
              setdeletebtn(!deletebtn);
            }}
          >
            <Trash />
            {!deletebtn ? "Delete" : `Selected: ${deleteRows.length}`}
          </Button>
        </div>
        <div className="endbtn flex gap-4 max-[510]:gap-2 max-[510]:flex-col max-[510]:w-full">
          <Button className="text-black bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer">
            <Sparkles />
            Generate Mock Data
          </Button>
          <ExportDropdown
            options={exportOptions}
            onSelect={handleExport}
            disabled={
              !selectedTable ||
              !tableData ||
              tableData.rows.length === 0
            }
            isLoading={isExporting}
          />
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        {loadtable ? (
          <div role="status" aria-live="polite" className="p-6">
            <div className="flex items-center gap-4">
              <svg
                className="animate-spin h-8 w-8"
                style={{ color: "var(--primary)" }}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              <div>
                <div className="h-4 w-56 bg-gray-200 rounded-md mb-2 animate-pulse" />
                <div className="text-sm text-gray-500">
                  Loading table data...
                </div>
              </div>
            </div>
            <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4 border border-gray-100">
              <div className="flex items-center gap-4 mb-3">
                <div
                  className="h-4 bg-gray-200 rounded"
                  style={{ width: "38%" }}
                />
                <div
                  className="h-4 bg-gray-200 rounded"
                  style={{ width: "16%" }}
                />
                <div
                  className="h-4 bg-gray-200 rounded"
                  style={{ width: "16%" }}
                />
                <div
                  className="h-4 bg-gray-200 rounded"
                  style={{ width: "16%" }}
                />
                <div
                  className="h-4 bg-gray-200 rounded"
                  style={{ width: "12%" }}
                />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
                    <div
                      className="h-4 bg-gray-200 rounded"
                      style={{ width: "16%" }}
                    />
                    <div
                      className="h-4 bg-gray-200 rounded"
                      style={{ width: "16%" }}
                    />
                    <div
                      className="h-4 bg-gray-200 rounded"
                      style={{ width: "16%" }}
                    />
                    <div
                      className="h-4 bg-gray-200 rounded"
                      style={{ width: "12%" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : tableData ? (
          <div className="w-full overflow-x-auto max-w-full overflow-y-auto h-fit p-5">
            <table className="min-w-max w-full table-auto">
              <thead className="tb_head">
                <tr>
                  {deletebtn ? (
                    <th className="px-4 py-2 border-b text-center whitespace-nowrap">
                      {" "}
                    </th>
                  ) : null}
                  {tableData.columns.map((col) => (
                    <th
                      key={col.name}
                      className="px-4 py-2 border-b whitespace-nowrap"
                    >
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.length > 0 ? (
                  tableData.rows.map((row, i) => (
                    <tr key={i} className="border-b">
                      {deletebtn ? (
                        deletebtn ? (
                          <td className="px-4 py-2 text-center whitespace-nowrap hover:bg-sidebar hover:border-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={deleteRows.some((dr) =>
                                tableData.columns
                                  .filter(
                                    (c) =>
                                      c.constraint === "PRIMARY KEY"
                                  )
                                  .every(
                                    (pkCol) =>
                                      row[pkCol.name] === dr[pkCol.name]
                                  )
                              )}
                              onChange={(e) => {
                                const pkCols = tableData.columns.filter(
                                  (c) => c.constraint === "PRIMARY KEY"
                                );
                                const columnsToUse = pkCols;
                                const pkValues = {};
                                columnsToUse.forEach((col) => {
                                  pkValues[col.name] = row[col.name];
                                });
                                if (e.target.checked) {
                                  setdeleteRows((prev) => [
                                    ...prev,
                                    pkValues,
                                  ]);
                                } else {
                                  setdeleteRows((prev) =>
                                    prev.filter(
                                      (val) =>
                                        !columnsToUse.every(
                                          (col) =>
                                            val[col.name] ===
                                            row[col.name]
                                        )
                                    )
                                  );
                                }
                              }}
                            />
                          </td>
                        ) : null
                      ) : null}
                      {tableData.columns.map((col) => (
                        <td
                          key={col.name}
                          className={`px-4 py-2 text-center whitespace-nowrap hover:bg-sidebar hover:border-1 cursor-pointer ${
                            editingCell?.rowIndex === i &&
                            editingCell?.colName === col.name
                              ? "hover:bg-sidebar ring-2 ring-blue-500 ring-opacity-50"
                              : ""
                          }`}
                          onClick={() => {
                            handleCellClick(i, col.name, row[col.name]);
                          }}
                        >
                          {editingCell?.rowIndex === i &&
                          editingCell?.colName === col.name ? (
                            <input
                              type="text"
                              className="w-full px-2 py-1 text-center focus:outline-none"
                              value={editedvalue}
                              onChange={(e) =>
                                seteditedvalue(e.target.value)
                              }
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
                      className="text-center py-4 text-gray-500"
                    >
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 italic">No table selected</div>
        )}
        {!isExpanded &&
          tableData &&
          tableData.rows.length === limit && (
            <div className="flex justify-center mt-3 w-full">
              <Button
                onClick={() => {
                  setIsExpanded(true);
                  fetchtabledata(selectedTable, null);
                }}
                className="text-black bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer"
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
      </div>
    </>
  );
}