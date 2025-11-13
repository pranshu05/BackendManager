"use client";
import { useState, useEffect,useCallback  } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/ui/header";
import Sidebar from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/ui/dropdown";
import ExportDropdown from "@/components/ui/ExportDropdown";
import SchemaPage from "@/components/(projects)/schema";
import Optimization from "@/components/(projects)/optimization";
import Query from "@/components/(projects)/query";
import {
  ArrowLeft,
  Database,
  Funnel,
  PencilLine,
  Trash,
  Download,
  Sparkles,
  Play,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react";


import { Textarea } from "@/components/ui/textarea"; 
import Modal from '@/components/ui/modal';

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

export default function DashboardPage() {
    const params = useParams();
    const projectid = params.slug;
    const [projects, setProjects] = useState([]);
    const [projectdetail, setprojectdetail] = useState({});

    // Initialize page state from localStorage (lazy initializer) to avoid a flash of the default value
    const [page, setpage] = useState(() => {
      try {
        if (typeof window !== 'undefined' && projectid) {
          const saved = localStorage.getItem(`dashboard:page:${projectid}`);
          return saved || 'table';
        }
      } catch (e) {
        // ignore
      }
      return '';
    });

    // If projectid changes (navigating between projects), restore saved page for that project
    useEffect(() => {
      try {
        if (typeof window !== 'undefined' && projectid) {
          const saved = localStorage.getItem(`dashboard:page:${projectid}`);
          if (saved && saved !== page) setpage(saved);
        }
      } catch (e) {
        // ignore
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectid]);

    // Wrapper to set page and persist to localStorage
    const handleSetPage = (newPage) => {
      setpage(newPage);
      try {
        if (typeof window !== 'undefined' && projectid) localStorage.setItem(`dashboard:page:${projectid}`, newPage);
      } catch (e) {
        // ignore storage errors
      }
    };
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableData, setTableData] = useState(null);
    const [tablelist, settablelist] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadtable, setloadtable] = useState(false);
    const [limit,] = useState(5);
    const [isExpanded, setIsExpanded] = useState(false);
    const [editingCell, setEditingCell] = useState(null);
    const [editedvalue, seteditedvalue] = useState("");
    const [deletebtn, setdeletebtn] = useState(false);
    const [deleteRows, setdeleteRows] = useState([])
    const [isExporting, setIsExporting] = useState(false);
    const [exportOptions, setExportOptions] = useState(["XLSX", "CSV", "JSON"]);   
    const [queryHistory, setQueryHistory] = useState([]);   // Stores the list of history items
    const [historyLoading, setHistoryLoading] = useState(false); // Is the history list loading?
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [queryToEdit, setQueryToEdit] = useState(null);
    const [editedSql, setEditedSql] = useState("");
    const [isModalRunning, setIsModalRunning] = useState(false);
    const [modalError, setModalError] = useState("");
    const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
    const [insertLoading, setInsertLoading] = useState(false);
    const [insertTableMeta, setInsertTableMeta] = useState(null);
  


      const handleinsertrow = async () => {
        try {
            setInsertLoading(true);
          if (!selectedTable) {
            alert('Please select a table before inserting a row');
            return;
          }

          const res = await fetch(`/api/projects/${projectid}/schema`, {
            credentials: 'include',
          });

          const payload = await res.json();
          console.log('Schema payload for insert row:', payload);
          if (!res.ok) {
            console.error('Failed to fetch schema for insert row:', payload.error || payload);
            alert(payload.error || 'Failed to fetch schema');
            return;
          }

          const schema = payload?.schema || [];
          const tableMeta = schema.find((t) => t.name === selectedTable);
          if (!tableMeta) {
            alert(`Table metadata for '${selectedTable}' not found`);
            return;
          }

          console.log('Metadata for insert row (from schema):', tableMeta);
          setInsertTableMeta(tableMeta);
          setIsInsertModalOpen(true);
          setInsertLoading(false);
        } catch (err) {
          console.error('Error in handleinsertrow:', err);
          alert('Error fetching table metadata: ' + (err?.message || err));
        }
      };
    const handleExport = async (format) => {
        console.log("Export Request for project:", projectid, "in format:", format);
    if (!selectedTable) {
      alert('Please select a table to export');
      return;
    }

    setIsExporting(true);
    try {
      const res = await fetch(`/api/projects/${projectid}/export?format=${format.toLowerCase()}&table=${encodeURIComponent(selectedTable)}`);
            
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to export data");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);

            // Get filename from Content-Disposition header or use project name
            const disposition = res.headers.get('Content-Disposition');
            const a = document.createElement('a');
            a.href = url;
            
            // Use the filename from the server, or fallback to project name
      if (disposition && disposition.includes('filename=')) {
        const filenameMatch = disposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          a.download = filenameMatch[1];
        } else {
          // fallback: use table name as filename
          a.download = `${selectedTable.replace(/[^a-z0-9]/gi, '_')}.${format.toLowerCase()}`;
        }
      } else {
        // fallback: use table name as filename
        a.download = `${selectedTable.replace(/[^a-z0-9]/gi, '_')}.${format.toLowerCase()}`;
      }
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up the blob URL after a short delay
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 1000);

        } catch (error) {
            console.error('Export error:', error);
            alert(error.message || 'Failed to export data');
        } finally {
            setIsExporting(false);
        }
    };


  
  const [historyLimit, setHistoryLimit] = useState(6); // Start by showing only 6 queries
  const [totalQueries, setTotalQueries] = useState(0); // Total queries in the database
  

  // This runs when the Editbutton is clicked
  const handleEdit = (query) => {
    console.log("Editing query:", query.sql);
    setQueryToEdit(query);      
    setEditedSql(query.sql);    
    setModalError("");          
    setIsEditModalOpen(true);   
  };

   // This runs when the Rerun button is clicked
    const handleRerun = async (sql) => {
      console.log("Rerunning query from history:", sql);
      setHistoryLoading(true); 
      try {
        // Call the API to run the query
        const res = await fetch(`/api/projects/${projectid}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: sql })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to rerun query");
        }
       
        await fetchHistory(); 
      } catch (err) {
        console.error("Error rerunning query:", err);
        alert(`Error rerunning query: ${err.message}`);
      }
    };
  
    // This runs when the Run Edited Query button 
    const handleRunEditedQuery = async () => {
      setIsModalRunning(true); // Show loading on the popup button
      setModalError("");
      try {
        // Call the API with the new SQL from the textarea
        const res = await fetch(`/api/projects/${projectid}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: editedSql }) 
        });
  
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to rerun query");
        }
        
        
        await fetchHistory();       
       
        setIsEditModalOpen(false);  
  
      } catch (err) {
        console.error("Error running edited query:", err);
        setModalError(err.message); 
      } finally {
        setIsModalRunning(false); 
      }
    };
  
    // Function to fetch the query history from your API
    const fetchHistory = useCallback(async () => {
      if (projectid) { 
        // Only show the main loading spinner if the history page is active
        if (page === "history") {
          setHistoryLoading(true);
        }
        try {
          // Call your API and send the historyLimit
          const res = await fetch(`/api/projects/${projectid}/history?limit=${historyLimit}`);
          if (!res.ok) {
            throw new Error("Failed to fetch query history");
          }
          
          const data = await res.json(); 
  
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
          setQueryHistory([]);
        } finally {
          if (page === "history") {
            setHistoryLoading(false); 
          }
        }
      }
    }, [page, projectid, historyLimit]);
  
    
    useEffect(() => {
      fetchHistory();
    }, [fetchHistory]);
    
  
  


    useEffect(() => {
        const fetchProjectsData = async () => {
            try {
                const res = await fetch("/api/projects", { cache: "no-store" });

                if (!res.ok) {
                    console.error("Failed to fetch projects", res.status);
                    setProjects([]);
                    return;
                }

                const data = await res.json();
                setProjects(data.projects || []);
                console.log("Fetched something: ", data);
            } catch (err) {
                console.error("Error fetching projects:", err);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProjectsData();
    }, []);

    useEffect(() => {
        if (projects.length > 0) {
            const proj = projects.find(p => String(p.id) === String(projectid));
            if (proj) {
                setprojectdetail(proj);
            }
        }
    }, [projects])


    useEffect(() => {
        setdeleteRows([]);
    }, [selectedTable]);

    const handleCellClick = (rowIndex, colName, value) => {
        setEditingCell({ rowIndex, colName, value });
        seteditedvalue(String(value ?? ""));
    };

   
    useEffect(() => {
      const onPointerDown = (e) => {
        if (!editingCell) return;
        try {
          // If the click is inside any table, let the normal table click handlers run (they will set editingCell appropriately)
          const insideTable = e.target && e.target.closest && e.target.closest('table');
          if (insideTable) return;

          // Otherwise, clear editing state and remove any residual focus/ring
          setEditingCell(null);
          try { document.activeElement && document.activeElement.blur && document.activeElement.blur(); } catch (err) {}
          requestAnimationFrame(() => {
            try {
              document.querySelectorAll('td').forEach(td => td.classList.remove('ring-2','ring-blue-500','ring-opacity-50'));
            } catch (err) {
              
            }
          });
        } catch (err) {
          // ignore
        }
      };

      document.addEventListener('pointerdown', onPointerDown);
      return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [editingCell]);

    const handledelete = async (e) => {
        if (deleteRows.length == 0) {
            alert("No rows selected for deletion");
            return;
        }

        console.log("Deleting rows: ", deleteRows);
  // Confirm deletion
  const proceed = window.confirm(`Are you sure you want to delete ${deleteRows.length} rows? This action cannot be undone.`);

        if (!proceed) {
            setdeleteRows([]);
            return;
        }

        try {
            const pkcolarray = [];
            //Get primary key columns from table metadata
            tableData.columns.forEach(col => {
                if (col.constraint === "PRIMARY KEY") {
                    pkcolarray.push(col.name);
                }
            });

            //pkvaluesarray will be array of objects, wwhere each obj has pk cols and value for record 
            //to be deleted
            const pkValuesArray = deleteRows.map(rowObj => {
                const pkVals = {};
                pkcolarray.forEach(colName => {
                    pkVals[colName] = rowObj[colName];
                });
                return pkVals;
            });

            const payload = {
                projectId: projectid,
                table: selectedTable || tableData.table,
                pkcols: pkcolarray,
                pkvalues: pkValuesArray
            };

      const res = await fetch(`/api/projects/${projectid}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

            const result = await res.json();

            if (!res.ok) {
                alert(result?.error || 'Failed to delete rows');
                return;
            }

            // On successful deletion, refetch table data
            alert(`Successfully deleted ${deleteRows.length} rows.`);
            setdeleteRows([]);
            setTableData(prev => {
                if (!prev) return prev;
                const filteredRows = prev.rows.filter((row, i) => {
                    //Check if this row was deleted
                    return !deleteRows.some(dr => {
                        return pkcolarray.every(colName => {
                            return row[colName] === dr[colName];
                        });
                    });
                });
                return { ...prev, rows: filteredRows };
            });

    } catch (err) {
      alert('Error deleting rows: ' + (err?.message || err));
    } finally {
            return;
        }
    }

    const handleCellKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();

            if (!editingCell || editedvalue === editingCell.value) {
                setEditingCell(null);
                return;
            }

      const proceed = window.confirm(
        `Are you sure you want to update this value?\nFrom: ${editingCell.value}\nTo: ${editedvalue}`
      );

            if (!proceed) {
                setEditingCell(null);
                return;
            }

            
            if (String(editedvalue).trim() === "") {
                alert('Value cannot be empty');
                return;
            }
            //Here, we call API for updating in the database neon
            (async () => {
                try {
                    // determine primary key column from metadata
                    const pkCol = tableData?.columns?.find(c => c.constraint === 'PRIMARY KEY')?.name || tableData?.columns?.[0]?.name;
                    const row = tableData.rows[editingCell.rowIndex];
                    const payload = {
                       
                        table: selectedTable || tableData.table,
                        pkColumn: pkCol,
                        pkValue: row[pkCol],
                        column: editingCell.colName,
                        newValue: String(editedvalue).trim(),
                        oldValue: editingCell.value
                    };

          const res = await fetch(`/api/projects/${projectid}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

                    const result = await res.json();
                    if (!res.ok) {
                        // show error to user
                        alert(result?.error || 'Failed to update value');
                    } else {
                        //Updating local table data
                        const updatedRow = result.row;
                        setTableData(prev => {
                            if (!prev) return prev;
                            const rows = prev.rows.map((r, idx) => {
                                if (idx !== editingCell.rowIndex) return r;

                                return updatedRow;
                            });
                            return { ...prev, rows };
                        });
                    }
                } catch (err) {
                    alert('Error updating value', err);
                } finally {

                    setEditingCell(null);
                }
            })();
        }
        else if (e.key === "Escape") {
            setEditingCell(null);
        }
    };

    

    useEffect(() => {
        if (!projectid) return;
        if (projectid) fetchTables();
    }, [projectid]);
              const fetchTables = async () => {
                try {
                  // Fetch the list of tables from the standard listing endpoint
                  const res = await fetch(`/api/projects/${projectid}/tables`, {
                    credentials: "include",
                  });

                  const data = await res.json();
                  if (!res.ok) {
                    console.error("Failed to fetch tables:", data.error);
                    return;
                  }

                  console.log("Fetched tables: ", data);
                  const names = (data.tables || []).map((t) => t.name);
                  settablelist(names);

                  if (names.length > 0) {
                    setSelectedTable(names[0]);
                    fetchtabledata(names[0]);
                  }
                } catch (err) {
                  console.error("Error fetching tables:", err);
                }
              };


    const fetchtabledata = async (tablename, recordLimit = limit) => {
        setLoading(true);
        try {
      // Build query params; if recordLimit is falsy (null/undefined), omit the limit param
      const params = `table=${encodeURIComponent(tablename)}${recordLimit ? `&limit=${recordLimit}` : ""}`;
      const res = await fetch(`/api/projects/${projectid}/tables?${params}`, {
        credentials: "include",
      });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch table data");
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
              open={isInsertModalOpen}
              onClose={() => {
                setIsInsertModalOpen(false);
                setInsertTableMeta(null);
                setInsertLoading(false);
              }}
              title={selectedTable ? `Insert into ${selectedTable}` : "Insert Row"}
              loading={insertLoading}
            >
              {insertTableMeta ? (
                <div className="space-y-3">

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    alert('Insert submit - implement POST to /api/projects/:id/insert');
                  }}>
                    {insertTableMeta.columns?.map((col) => (
                      <div key={col.name} className="flex flex-col mb-2">
                        <label className="text-sm">{col.name}{col.constraint === 'PRIMARY KEY' ? ' (PK)' : ''}</label>
                        <input name={col.name} className="border rounded p-2" />
                      </div>
                    ))}
                    <div className="flex gap-2 mt-4">
                      <button type="button" className="px-4 py-2 border rounded" onClick={() => setIsInsertModalOpen(false)}>Cancel</button>
                      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Insert</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">No metadata available. Try re-opening the dialog.</p>
                  <div className="mt-3">
                    <button onClick={handleinsertrow} className="px-3 py-1 border rounded">Retry</button>
                  </div>
                </div>
              )}
            </Modal>
            <div className="db bg-white w-full flex items-center h-26 gap-4 px-6">
                <div className="db_left h-26 flex justify-center items-center">
                    <ArrowLeft className="hover:cursor-pointer" onClick={() => {
                        globalThis.location.href = '/dashboard'
                    }} />
                </div>
                <div className="db_right w-full h-26 flex  gap-2">
                    <div className="db_icon flex  items-center">
                        <div className="p-2 bg-slate-300 flex justify-center items-center rounded-xl w-12 h-12">
                            <Database />
                        </div>
                    </div>
                    <div className="details flex flex-col justify-center">
                        <span className=" text-xs  md:text-xl">{projectdetail.project_name}</span>
                        <span className="text-gray-600  text-xs  md:text-sm">{projectdetail.description}</span>
                        <span className="text-xs text-gray-600"> 📊 {projectdetail.table_count} Tables</span>
                    </div>
                </div>
            </div>
            <div className="content flex flex-row w-full flex-1 min-h-0">
                <Sidebar active={page} onSelectPage={(newPage) => handleSetPage(newPage)} />

                <div className="rightcontent flex flex-col w-full border-1 overflow-x-hidden overflow-y-scroll min-h-0 h-screen">
                {page=="table"?<>
                     <div className="table_select h-14 flex flex-row items-center bg-white sm:p-4 gap-2 max-[510]:flex-col max-[510]:h-25">
                        Table Explorer
                        <Dropdown
                            items={tablelist}
                            selected={selectedTable}
                            onSelect={(t) => {
                                setSelectedTable(t)
                                fetchtabledata(t);
                                setIsExpanded(false)
                                setloadtable(true)
                            }
                            }
                        />
                    </div>
          {/* filter bar removed per UX request */}
                    <div className="mockbutton  h-28 gap-2 bg-white items-center flex-col  max-[510]:h-65   min-[820]:flex-row min-[820]:h-19 flex p-4 justify-between">
                        <div className="frontbtn flex flex-row gap-2 max-[510]:flex-col max-[510]:w-full max-[510]:gap-3">
                            <Button className=" max-[510]:w-full hover:cursor-pointer" onClick={()=>{
                              handleinsertrow();
                            }}>+ Insert Row</Button>
              <Button className="text-black bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer" onClick={async () => {
                if (deletebtn && deleteRows.length > 0) {
                  await handledelete();
                }
                else{
                  setdeleteRows([]);
                }
                setdeletebtn(!deletebtn);
              }}><Trash />{!deletebtn ? "Delete" : `Selected: ${deleteRows.length}`}</Button>
                        </div>
                        <div className="endbtn flex gap-4 max-[510]:gap-2 max-[510]:flex-col max-[510]:w-full">
                            <Button className="text-black bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer"><Sparkles />Generate Mock Data</Button>
                            <ExportDropdown 
                              options={exportOptions}
                              onSelect={handleExport}
                              disabled={!selectedTable || !tableData || tableData.rows.length === 0}
                              isLoading={isExporting}
                            />
                        </div>
                    </div>
                    {/* Table here */}
          <div className="flex-1 min-h-0 flex flex-col">
            {loadtable ? (
              <div role="status" aria-live="polite" className="p-6">
                <div className="flex items-center gap-4">
                  <svg className="animate-spin h-8 w-8" style={{ color: 'var(--primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                  <div>
                    <div className="h-4 w-56 bg-gray-200 rounded-md mb-2 animate-pulse" />
                    <div className="text-sm text-gray-500">Loading table data...</div>
                  </div>
                </div>

                <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-4 border border-gray-100">
                  {/* header placeholders - approximate column widths */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="h-4 bg-gray-200 rounded" style={{ width: '38%' }} />
                    <div className="h-4 bg-gray-200 rounded" style={{ width: '16%' }} />
                    <div className="h-4 bg-gray-200 rounded" style={{ width: '16%' }} />
                    <div className="h-4 bg-gray-200 rounded" style={{ width: '16%' }} />
                    <div className="h-4 bg-gray-200 rounded" style={{ width: '12%' }} />
                  </div>

                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex gap-4 items-center">
                        <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
                        <div className="h-4 bg-gray-200 rounded" style={{ width: '16%' }} />
                        <div className="h-4 bg-gray-200 rounded" style={{ width: '16%' }} />
                        <div className="h-4 bg-gray-200 rounded" style={{ width: '16%' }} />
                        <div className="h-4 bg-gray-200 rounded" style={{ width: '12%' }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) :
                            tableData ? <div className="w-full overflow-x-auto max-w-full overflow-y-auto h-fit p-5">
                                <table className="min-w-max w-full table-auto">
                                    <thead className="tb_head">
                                        <tr>
                                            {
                                                deletebtn ? <th className="px-4 py-2 border-b text-center whitespace-nowrap"> </th> : null
                                            }
                                            {tableData.columns.map((col) => (
                                                <th key={col.name} className="px-4 py-2 border-b whitespace-nowrap">
                                                    {col.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tableData.rows.length > 0 ?
                                            (
                                                tableData.rows.map((row, i) => (
                                                    <tr key={i} className="border-b">
                                                        {
                                                            deletebtn ? deletebtn ? <td className="px-4 py-2 text-center whitespace-nowrap hover:bg-sidebar hover:border-1 cursor-pointer">
                                                                <input
                                                                    type="checkbox"

                                                                    //here, in check we actually keep those rows checked
                                                                    //whose PK(s) are there in deleteRows
                                                                    checked={deleteRows.some(dr =>
                                                                        // Get all PK columns
                                                                        tableData.columns
                                                                            .filter(c => c.constraint === 'PRIMARY KEY')
                                                                            .every(pkCol => row[pkCol.name] === dr[pkCol.name])
                                                                    )}
                                                                    onChange={(e) => {

                                                                        // Get all PK columns
                                                                        const pkCols = tableData.columns.filter(c => c.constraint === 'PRIMARY KEY');
                                                                        const columnsToUse = pkCols;

                                                                        // pkValues object stores PKs for rows to be deleted
                                                                        const pkValues = {};
                                                                        columnsToUse.forEach(col => {
                                                                            pkValues[col.name] = row[col.name];
                                                                        });

                                                                        if (e.target.checked) {
                                                                            setdeleteRows(prev => [...prev, pkValues]);
                                                                        } else {
                                                                            setdeleteRows(prev => prev.filter(val =>
                                                                                !columnsToUse.every(col => val[col.name] === row[col.name])
                                                                            ));
                                                                        }
                                                                    }}
                                                                />
                                                            </td> : null : null
                                                        }
                                                        {
                                                            tableData.columns.map((col) => (
                                                                <td
                                                                    key={col.name}
                                                                    className={`px-4 py-2 text-center whitespace-nowrap hover:bg-sidebar hover:border-1 cursor-pointer ${editingCell?.rowIndex === i && editingCell?.colName === col.name
                                                                        ? "hover:bg-sidebar ring-2 ring-blue-500 ring-opacity-50"
                                                                        : ""
                                                                        }`}
                                                                    onClick={() => {

                                                                        handleCellClick(i, col.name, row[col.name])
                                                                    }
                                                                    }
                                                                >
                                                                    {editingCell?.rowIndex === i && editingCell?.colName === col.name ? (
                                                                        <input
                                                                            type="text"
                                                                            className="w-full px-2 py-1 text-center focus:outline-none"
                                                                            value={editedvalue}
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
                                                        className="text-center py-4 text-gray-500"
                                                    >
                                                        No records found
                                                    </td>
                                                </tr>
                                            )}

                                    </tbody>
                                </table>
                          

                            </div>

                                :
                                <div className="text-gray-500 italic">No table selected</div>
                        }
                         {!isExpanded && tableData && tableData.rows.length === limit && (
                                    <div className="flex justify-center mt-3 w-full">
                                        <Button
                                            onClick={() => {
                                                setIsExpanded(true);
                                                fetchtabledata(selectedTable, null); // null means fetch all
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
                    :page=="query"?
                    <>
                     <Query />
                    </>
                    :page=="history"?<div className="p-6 ">
                       
            <h2 className="text-2xl font-semibold mb-6 text-blue-900">
              Query History
            </h2>
            
            {/* This is the Edit Query Popup  */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
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
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isModalRunning}>Cancel</Button>
                  <Button onClick={handleRunEditedQuery} disabled={isModalRunning}>
                    {isModalRunning ? "Running..." : "Run Edited Query"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* This is the History List */}
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
                    {/* History Item Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
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
                        <p className="font-medium text-gray-800">
                          {query.title}
                        </p>
                      </div>
                      <div className="flex gap-3 text-gray-500">
                        {/* Rerun Button */}
                        <button
                          onClick={() => handleRerun(query.sql)}
                          className="hover:text-gray-800"
                          title="Rerun Query"
                        >
                          <Play size={16} />
                        </button>
                        {/* Edit Button */}
                        <button
                          onClick={() => handleEdit(query)} 
                          className="hover:text-gray-800"
                          title="Edit Query"
                        >
                          <PencilLine size={16} />
                        </button>
                      </div>
                    </div>
                    {}
                    <code className="block bg-gray-100 text-gray-800 p-2 rounded-md text-sm mb-2">
                      {query.sql}
                    </code>
                    {/* Error Message  */}
                    {query.status === "error" && (
                      <p className="text-sm text-red-500 mb-2">
                        {query.result}
                      </p>
                    )}
                    {/* Footer (Time & Result) */}
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
            
            {/* Load More Button */}
            {!historyLoading && queryHistory.length > 0 && queryHistory.length < totalQueries && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => setHistoryLimit(99999)} // Set limit to a large number to load all
                  variant="outline"
                  className="bg-white shadow-md"
                >
                  Load All Previous ({totalQueries - queryHistory.length} more)
                </Button>
              </div>
            )}
    
                    </div> :
                    page=="optimization"?<>
                       <Optimization />
                    </> :
                      page=="schema"?<>
                    <SchemaPage />
                    </> :
                    <>
                    </>
                
                   }
                    
                </div>
              
            </div>
        </div> 
    );
}