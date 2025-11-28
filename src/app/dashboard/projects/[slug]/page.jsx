"use client";
import { useState, useEffect} from "react";
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
import Modal from "@/components/ui/modal";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { showToast } from "nextjs-toast-notify";
import {
  ArrowLeft,
  Database,
  Trash,
  Sparkles,
  Loader2,
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
  const [loadtable, setloadtable] = useState(false);
  const [loadmore, setloadmore] = useState(false);
  const [limit,setlimit] = useState(5);
  const [isExpanded, setIsExpanded] = useState(false);

  const [editingCell, setEditingCell] = useState(null);
  const [editedvalue, seteditedvalue] = useState("");
  // Update confirmation modal state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [pendingUpdatePayload, setPendingUpdatePayload] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  const [deletebtn, setdeletebtn] = useState(false);
  const [deleteRows, setdeleteRows] = useState([]);

  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState(["XLSX", "CSV", "JSON"]);

  const [showSummary, setShowSummary] = useState(false);

  // Used to pass a selected query from history to query editor
  const [queryToPass, setQueryToPass] = useState(null);

  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [insertLoading, setInsertLoading] = useState(false);
  const [insertTableMeta, setInsertTableMeta] = useState(null);
  const [deletemodalopen,setdeletemodalopen]=useState(false);
  const [deleteloading,setdeleteloading]=useState(false);

  const handleSetPage = (newPage) => {
    setpage(newPage);
  };

 const handleinsertrow = async () => {
        try {
         
          if (!selectedTable) {
            showToast.warning('Please select a table before inserting a row', {
              duration: 2000,
              progress: true,
              position: "top-center",
              transition: "bounceIn",
            }
            )
           
            return;
          }
           setIsInsertModalOpen(true);
          const res = await fetch(`/api/projects/${projectid}/schema`, {
            credentials: 'include',
          });

          const payload = await res.json();

          if (!res.ok) {
            console.error('Failed to fetch schema for insert row:', payload.error || payload);
            showToast.error(payload.error || 'Failed to fetch schema for insert row', {
              duration: 2000,
              progress: true,
              position: "top-center",
              transition: "bounceIn",
            });
            return;
          }

          const schema = payload?.schema || [];
          const tableMeta = schema.find((t) => t.name === selectedTable);
          if (!tableMeta) {
            showToast.error(`Table metadata for '${selectedTable}' not found`, {
              duration: 2000,
              progress: true,
              position: "top-center",
              transition: "bounceIn",
            });
            return;
          }

          console.log('Metadata for insert row (from schema):', tableMeta);
          setInsertTableMeta(tableMeta);
          setIsInsertModalOpen(true);
          setInsertLoading(false);
        } catch (err) {
          console.error('Error in handleinsertrow:', err);
          showToast.error('Error fetching table metadata: ' + (err?.message || err), {
              duration: 2000,
              progress: true,
              position: "top-center",
              transition: "bounceIn",
            });
        }
      };


  const handleinsertSubmit=async(e)=>{
    e.preventDefault();
    try {
      setInsertLoading(true);
      const form = e.target;
      const fd = new FormData(form);
      const body = {};
      for (const [key, value] of fd.entries()) {
      if(value!=='')
        body[key] = value;
      }
      const res = await fetch(`/api/projects/${projectid}/insert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: selectedTable, insertData: body }),
        credentials: "include",
      });

      const payload = await res.json();
      if (!res.ok) {
        try {
          const parseResponse = await fetch(`/api/ai/parse-error/${projectid}`, { method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: payload?.error})});
          const parseData = await parseResponse.json();
          if (parseData.success && parseData.parsed) {
            showToast.error(parseData.parsed.userFriendlyExplanation, {
              duration: 5000,
              progress: true,
              position: "top-center",
              transition: "bounceIn",
            });
          } else {
            showToast.error(payload?.error || "Failed to prepare insert", {
              duration: 5000,
              progress: true,
              position: "top-center",
              transition: "bounceIn",
            });
          }
        } catch (parseError) {
          console.error("Error parsing insert error:", parseError);
          showToast.error(payload?.error || "Failed to prepare insert",{
            duration: 2000,
            progress: true,
            position: "top-center",
            transition: "bounceIn",
          });
        }
        
      } else {
        showToast.success('Row inserted successfully!', {
          duration: 2000,
          progress: true,
          position: "top-center",
          transition: "bounceIn",
        });

      }
    } catch (err) {
      showToast.error('Error preparing insert payload: ' + (err?.message || err), {
        duration: 2000,
        progress: true,
        position: "top-center",
        transition: "bounceIn",
      });
   
    }
      setInsertLoading(false);
      setIsInsertModalOpen(false);
      setInsertTableMeta(null);
      fetchtabledata(selectedTable);
    
  }

  const handleExport = async (format) => {

    if (!selectedTable) {
      showToast.error("Please select a table to export", {
        duration: 2000,
        progress: true,
        position: "top-center",
        transition: "bounceIn",
      });
      return;
    }

    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/projects/${projectid}/export?format=${format.toLowerCase()}&table=${encodeURIComponent(selectedTable)}`
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

      // Use the filename from the server if provided
      if (disposition && disposition.includes("filename=")) {
        const filenameMatch = disposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          a.download = filenameMatch[1];
        } else {
          // fallback: use table name as filename
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
    } catch (error) {
      console.error("Export error:", error);
      showToast.error(error.message || "Failed to export data", {
        duration: 2000,
        progress: true,
        position: "top-center",
        transition: "bounceIn",
      });
    } finally {
      setIsExporting(false);
    }
  };



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


  useEffect(() => {
    if (projects.length > 0) {
      const proj = projects.find((p) => String(p.id) === String(projectid));
      if (proj) setprojectdetail(proj);
    }
  }, [projects]);

 // Clear selected rows when table changes
  useEffect(() => {
    setdeleteRows([]);
  }, [selectedTable]);


  const handleCellClick = (rowIndex, colName, value) => {
    setEditingCell({ rowIndex, colName, value });
    seteditedvalue(String(value ?? ""));
  };


  const handledelete = async (e) => {
    if (deleteRows.length == 0) {
      return;
    }
    setdeletemodalopen(true);
  };

  const deleteselectedrows = async () => {
       try {
      const pkcolarray = [];
      //Get primary key columns from table metadata
      tableData.columns.forEach((col) => {
        if (col.constraint === "PRIMARY KEY") {
          pkcolarray.push(col.name);
        }
      });

      //pkvaluesarray will be array of objects, wwhere each obj has pk cols and value for record
      //to be deleted
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

      const res = await fetch(`/api/projects/${projectid}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        // Parse the error using AI for user-friendly message
        try {
          const parseResponse = await fetch(`/api/ai/parse-error/${projectid}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              error: result?.error || "Failed to delete rows"
            }),
          });
          
          const parseData = await parseResponse.json();
          if (parseData.success && parseData.parsed) {
            showToast.error(parseData.parsed.userFriendlyExplanation, {
              duration: 10000,
              progress: true,
              position: "top-center",
              transition: "bounceIn",
            });
          } else {
            // Fallback to original error
            showToast.error(result?.error || "Failed to delete rows", {
              duration: 2000,
              progress: true,
              position: "top-center",
              transition: "bounceIn",
            });
          }
        } catch (parseError) {
          console.error("Error parsing deletion error:", parseError);
          // Fallback to original error
          showToast.error(result?.error || "Failed to delete rows", {
            duration: 2000,
            progress: true,
            position: "top-center",
            transition: "bounceIn",
          });
        }
        
        setdeleteRows([]);
        setdeletemodalopen(false);
        setdeleteloading(false);
        return;
      }

    showToast.success(`Successfully deleted ${deleteRows.length} rows.`, {
    duration: 2000,
    progress: true,
    position: "top-center",
    transition: "bounceIn",
    icon: '',
    sound: true,
  });
      setdeleteRows([]);
      setdeletemodalopen(false);
      setdeleteloading(false);
      setTableData((prev) => {
        if (!prev) return prev;
        const filteredRows = prev.rows.filter((row, i) => {
          //Check if this row was deleted
          return !deleteRows.some((dr) => {
            return pkcolarray.every((colName) => {
              return row[colName] === dr[colName];
            });
          });
        });
        return { ...prev, rows: filteredRows };
      });
    } catch (err) {

    showToast.error("Error deleting rows: " + (err?.message || err), {
    duration: 4000,
    progress: true,
    position: "top-center",
    transition: "bounceIn",
    icon: '',
    sound: true,
  });
    } 

  }

  const handleCellKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (!editingCell || editedvalue === editingCell.value) {
        setEditingCell(null);
        return;
      }

      // Prevent sending empty or whitespace-only values
      if (String(editedvalue).trim() === "") {
        showToast.error("Value cannot be empty", {
          duration: 2000,
          progress: true,
          position: "top-center",
          transition: "bounceIn",
        });
        return;
      }

      // Build the payload (do not perform update yet) and open confirmation modal
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
          editingRowIndex: editingCell.rowIndex,
        };

        setPendingUpdatePayload(payload);
        setIsUpdateModalOpen(true);
      } catch (err) {
        console.error('Error preparing update payload:', err);
        showToast.error('Error preparing update.', {
          duration: 2000,
          progress: true,
          position: "top-center",
          transition: "bounceIn",
        });
        setEditingCell(null);
      }
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  async function performUpdate(payload) {
    setUpdateLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectid}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: payload.table,
          pkColumn: payload.pkColumn,
          pkValue: payload.pkValue,
          column: payload.column,
          newValue: payload.newValue,
          oldValue: payload.oldValue,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        // show error to user
        showToast.error(result?.error || "Failed to update value", {
          duration: 2000,
          progress: true,
          position: "top-center",
          transition: "bounceIn",
        });
      } else {
        const updatedRow = result.row;
        setTableData((prev) => {
          if (!prev) return prev;
          const rows = prev.rows.map((r, idx) => {
            if (idx !== payload.editingRowIndex) return r;

            return updatedRow;
          });
          return { ...prev, rows };
        });
      }
    } catch (err) {
      alert("Error updating value", err);
    } finally {
      setEditingCell(null);
      setPendingUpdatePayload(null);
      setIsUpdateModalOpen(false);
      setUpdateLoading(false);
    }
  }
 
const fetchTables = async () => {
    try {
      const res = await fetch(`/api/projects/${projectid}/tables`, {
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to fetch tables:", data.error);
        return;
      }
    
      const names = data.tables.map((t) => t.name);
      settablelist(names);

      if (names.length > 0) {
        setSelectedTable(names[0]);
        fetchtabledata(names[0]);
      }
    } catch (err) {
      console.error("Error fetching tables:", err);
    }
  };

  useEffect(() => {
    if (!projectid) return;
    if (projectid) fetchTables();
  }, [projectid]);


const fetchtabledata = async (tablename, recordLimit = limit) => {
    setLoading(true);   
    try {
      // Build query params; if recordLimit is falsy (null/undefined), omit the limit param
      const params = `table=${encodeURIComponent(tablename)}${
        recordLimit ? `&limit=${recordLimit}` : ""
      }`;
      const res = await fetch(`/api/projects/${projectid}/tables?${params}`, {
        credentials: "include",
      });
      const data = await res.json();
      if(data.rows==null || data.rows.length<recordLimit)
      setloadmore(false);
      if (!res.ok) throw new Error(data.error);
      setTableData(data);

      setloadtable(false);
    } catch (err) {
      console.error("Error fetching table data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-accent/20 to-secondary/30">
      <Header />

      <Modal
      open={deletemodalopen}
      onClose={() => 
      {  
        setdeletemodalopen(false)
        setdeleteRows([]);

      }


      }
      title={`Are you sure you want to delete the selected rows?`}
      subtitle={`This action can't be undone!`}
      loading={deleteloading}
      loadingTitle={deleteloading ? 'Deleting...' : undefined}
      loadingSubtitle={deleteloading ? 'Please wait while we delete the rows.' : undefined}
      loadingOverlay={true}
      >
         <form onSubmit={async (e) => {
                    e.preventDefault();
                    setdeleteloading(true);
                    await deleteselectedrows();
                  }}>
                    <div className="flex gap-2 mt-4">
                      <button type="button" className="px-4 py-2 border rounded cursor-pointer" onClick={() => 
                       {
                        setdeleteRows([]);
                        setdeletemodalopen(false)
                      }
                        
                        }>Cancel</button>
                      <button type="submit" className="px-4 py-2 border rounded text-red-800 cursor-pointer">Delete</button>
                    </div>
                  </form>
      </Modal>
      <Modal
              open={isInsertModalOpen}
              onClose={() => {
                setIsInsertModalOpen(false);
                setInsertTableMeta(null);
                setInsertLoading(false);
              }}
              title={selectedTable ? `Insert into ${selectedTable}` : "Insert Row"}
              loading={insertLoading}
              loadingTitle={insertLoading ? 'Inserting...' : undefined}
              loadingSubtitle={insertLoading ? 'Please wait while we insert the row.' : undefined}
              loadingOverlay={true}
            >
              {insertTableMeta ? (
                <div className="space-y-3">

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    await handleinsertSubmit(e);
                  }}>
                    {insertTableMeta.columns?.map((col) => {
                      if (col.constraint === "PRIMARY KEY") return null;
                      const isRequired = !col.nullable && col.default === null;
                      return (
                        <div key={col.name} className="flex flex-col mb-2">
                          <label className="text-sm">
                            {col.name}
                            {isRequired && (
                              <span className="text-red-500 ml-1" aria-hidden>
                                *
                              </span>
                            )}
                          </label>
                          <input
                            name={col.name}
                            required={isRequired}
                            placeholder={
                              !col.nullable && col.default
                                ? `${col.default} will be set if no value provided`
                                : ""
                            }
                            className="border rounded p-2"
                          />
                        </div>
                      );
                    })}
                    <div className="flex gap-2 mt-4">
                      <button type="button" className="px-4 py-2 border rounded cursor-pointer" onClick={() => setIsInsertModalOpen(false)}>Cancel</button>
                      <button type="submit" className="px-4 py-2 bg-primary text-white rounded cursor-pointer">Insert</button>
                    </div>
                  </form>
                 
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">No metadata available. Try re-opening the dialog.</p>
                  <div className="mt-3">
                    <button onClick={handleinsertrow} className="px-3 py-1 border rounded cursor-pointer">Please wait or retry</button>
                  </div>
                </div>
              )}
            </Modal>
      <Modal
        open={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setPendingUpdatePayload(null);
          setEditingCell(null);
        }}
        title={pendingUpdatePayload ? `Update ${pendingUpdatePayload.column}` : 'Confirm Update'}
        subtitle={pendingUpdatePayload ? `Change value from "${pendingUpdatePayload.oldValue}" to "${pendingUpdatePayload.newValue}"?` : ''}
        loading={updateLoading}
        loadingTitle={updateLoading ? 'Updating...' : undefined}
        loadingSubtitle={updateLoading ? 'Please wait while we update the value.' : undefined}
        loadingOverlay={true}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Are you sure you want to update this value?</p>
          <div className="flex gap-2 mt-4">
            <button type="button" className="px-4 py-2 border rounded cursor-pointer" onClick={() => {
              setIsUpdateModalOpen(false);
              setPendingUpdatePayload(null);
              setEditingCell(null);
            }}>Cancel</button>
            <button type="button" className="px-4 py-2 bg-primary text-white rounded cursor-pointer" onClick={async () => {
              if (!pendingUpdatePayload) return;
              await performUpdate(pendingUpdatePayload);
            }}>
              {updateLoading ? 'Updating...' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>

      <div className="db bg-white w-full flex items-center h-26 gap-4 px-6">
        <div className="db_left flex items-center">
          <ArrowLeft
            className="cursor-pointer"
            onClick={() => (globalThis.location.href = "/dashboard")}
          />
        </div>

        <div className="db_right w-full flex gap-2">
          <div className="db_icon flex items-center">
            <div className="p-2 bg-slate-300 rounded-xl w-12 h-12 flex items-center justify-center">
              <Database />
            </div>
          </div>

          <div className="details flex flex-col justify-center">
            <span className="text-xs md:text-xl">{projectdetail.project_name}</span>
            <span className="text-gray-600 text-xs md:text-sm">
              {projectdetail.description}
            </span>
            <span className="text-xs text-gray-600">
              📊 {projectdetail.table_count} Tables
            </span>
          </div>

          <div className="ml-auto flex items-center">
            <Button onClick={() => setShowSummary(true)} className="generate-btn cursor-pointer">
              <Sparkles className="w-4 h-4 mr-1" />
              Summary
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="content flex flex-row w-full flex-1 min-h-0">
        <Sidebar active={page} onSelectPage={(p) => setpage(p)} />


        <div className="rightcontent flex flex-col w-full border-1 overflow-x-hidden overflow-y-scroll min-h-0 h-screen">
      
          {page === "table" ? (
            <>
              <div className="table_select h-14 flex items-center bg-white p-4 gap-2">
                Table Explorer
                <Dropdown
                  items={tablelist}
                  selected={selectedTable}
                  onSelect={(t) => {
                    if(t===selectedTable) return;
                    setSelectedTable(t);
                    fetchtabledata(t);
                    setIsExpanded(false);
                    setloadtable(true);
                  }}
                />
              </div>

              <div className="mockbutton  h-28 gap-2 bg-white items-center flex-col  max-[830]:h-65   min-[830]:flex-row min-[830]:h-19 flex p-4 justify-between">
               <div className="frontbtn flex flex-row gap-2 max-[830]:flex-col max-[830]:w-full max-[830]:gap-3">
                    <Button className="max-[510]:w-full" disabled={insertLoading} onClick={async ()=>{
                   
                    await handleinsertrow();
                  
                   
                  }}>
                    {insertLoading ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Loading...
                      </>
                    ) : (
                      "+ Insert Row"
                    )}
                  </Button>

                  <Button
                   className="text-black bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer"
                    onClick={ tableData ? async () => {
                      if (deletebtn) await handledelete();
                      setdeletebtn(!deletebtn);
                    }: null}
                  >
                    <Trash />
                    {!deletebtn ? "Delete" :  tableData && tableData.rows.length > 0 ? `Selected: ${deleteRows.length}` : "Delete"}
                  </Button>
                </div>

            <div className="endbtn flex gap-4 max-[830]:gap-2 max-[830]:flex-col max-[830]:w-full">
                  <MockDataGenerator
                 
                    projectId={projectid}
                    onSuccess={() => selectedTable && fetchtabledata(selectedTable)}
                  />

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
                {loadtable? (
                  <div  className="p-6">
                    <div className="flex items-center gap-4">
                      <svg
                        className="animate-spin h-8 w-8"
                        style={{ color: "var(--primary)" }}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                      >
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        ></path>
                      </svg>
                      <div>
                        <div className="h-4 w-56 bg-gray-200 rounded-md mb-2" />
                        <div className="text-sm text-gray-500">
                          Loading table data...
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4 border border-gray-100">

                      <div className="flex items-center gap-4 mb-3">
                        <div
                          className="h-4 bg-gray-200 rounded"
                          style={{ width: "35%" }}
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
                        <div className="h-4 bg-gray-200 rounded flex-1" />
                        <div className="h-4 bg-gray-200 rounded" style={{ width: '16%' }} />
                        <div className="h-4 bg-gray-200 rounded" style={{ width: '16%' }} />
                        <div className="h-4 bg-gray-200 rounded" style={{ width: '16%' }} />
                        <div className="h-4 bg-gray-200 rounded" style={{ width: '12%' }} />
                      </div>
                    ))}
                      </div>
                    </div>
                  </div>
                ) : tableData ? (
                  <>
                  <div className="w-full overflow-x-auto max-w-full overflow-y-auto h-fit p-5">
                    <table className="min-w-max w-full table-auto">
                      <thead className="tb_head">
                        <tr>
                          {deletebtn && tableData && tableData.rows.length>0? (
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
                                deletebtn? (
                                  <td className="px-4 py-2 text-center whitespace-nowrap hover:bg-sidebar hover:border-1 cursor-pointer">
                                  { tableData.rows.length>0? <input
                                      type="checkbox"
                                      //here, in check we actually keep those rows checked
                                      //whose PK(s) are there in deleteRows
                                      checked={deleteRows.some((dr) =>
                                        // Get all PK columns
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
                                        // Get all PK columns
                                        const pkCols = tableData.columns.filter(
                                          (c) => c.constraint === "PRIMARY KEY"
                                        );
                                        const columnsToUse = pkCols;

                                        // pkValues object stores PKs for rows to be deleted
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
                                    />:<></>}
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
                  {
                    tableData && tableData.rows.length>0 ? (
                      <div className="flex justify-center mt-3 w-full">
                        <Button
                          onClick={async () => {
                            setloadmore(true);
                            if (isExpanded) {
                              await fetchtabledata(selectedTable, limit);
                              setIsExpanded(false);
                            } else {
                              // Expand to full data
                              await fetchtabledata(selectedTable, null); // null means fetch all
                              setIsExpanded(true);
                            }
                            setloadmore(false);
                          }}
                          className="text-black bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer"
                          disabled={loadmore}
                        >
                          {loadmore ? (
                              <>
                               <DotLottieReact
                              src="https://lottie.host/bc9b7976-f4d5-43d6-bf35-d97023948cbd/0LrKX98liy.lottie"
                              loop
                              autoplay
                              style={{ width: 28, height: 28 }}
                            />
                            Loading...
                            </>
                           
                            
                          ) : isExpanded ? (
                            "Load Less"
                          ) : (
                            "Load More"
                          )
                          }
                        </Button>
                      </div>
                    ) : (
                      <></>
                    )
                  }
                  </>
                  
                ) : (
                  <>
                   <div  className="p-6">
                    <div className="flex items-center gap-4">
                      <svg
                        className="animate-spin h-8 w-8"
                        style={{ color: "var(--primary)" }}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                      >
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
                          className="h-4 bg-gray-200 rounded "
                          style={{ width: "35%" }}
                        />
                        <div
                          className="h-4 bg-gray-200 rounded  animate-pulse"
                          style={{ width: "16%" }}
                        />
                        <div
                          className="h-4 bg-gray-200 rounded "
                          style={{ width: "16%" }}
                        />
                        <div
                          className="h-4 bg-gray-200 rounded"
                          style={{ width: "16%" }}
                        />
                        <div
                          className="h-4 bg-gray-200 rounded  animate-pulse"
                          style={{ width: "12%" }}
                        />
                      </div>

                      <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="flex gap-4 items-center">
                            <div className="h-4 bg-gray-200 rounded flex-1" />
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
                              className="h-4 bg-gray-200 rounded "
                              style={{ width: "12%" }}
                            />
                          </div>
                        )
                        )}
                      </div>
                    </div>
                  </div>
                  </>
                )}
              
              </div>
              
            </>
          ) : page == "query" ? (
            <>
              <Query initialQuery={queryToPass} onQueryMounted={() => setQueryToPass(null)} />
            </>
          ) :page==="history" ? (
            <>
              <History handleSetPage={handleSetPage} setQueryToPass={setQueryToPass} />
            </>
          ): page==="optimization" ? (
            <>
              <Optimization />
            </>
          ): page==="schema" ? (
            <>
              <SchemaPage />
            </>
          ): (<></>

          )
        }
      </div>

      {showSummary && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
          <SummaryCard projectId={projectid}  onClose={() => setShowSummary(false)} />
        </div>
      )}
    </div>
    </div>

  )}
