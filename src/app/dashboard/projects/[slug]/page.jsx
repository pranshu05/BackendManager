"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/ui/header";
import Sidebar from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/ui/dropdown";
import SchemaPage from "@/components/(projects)/schema";
import { ArrowLeft, Database, Funnel, Trash, Download, Sparkles, Send } from "lucide-react";


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
    const [limit,] = useState(5);
    const [isExpanded, setIsExpanded] = useState(false);
    const [editingCell, setEditingCell] = useState(null);
    const [editedvalue, seteditedvalue] = useState("");
    const [deletebtn, setdeletebtn] = useState(false);
    const [deleteRows, setdeleteRows] = useState([]);
    const [query, setQuery] = useState("");



    //DElete rows is an array of objects, where each object contains primary key cols and
    //their values for rows to be deleted

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
            alert("No rows selected for deletion");
            return;
        }

        console.log("Deleting rows: ", deleteRows);
        //Confirm deletion
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

            //On successful deletion, refetch table data
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
            alert('Error deleting rows', err);
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

            // Prevent sending empty or whitespace-only values
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

        if (projectid) fetchTables();
    }, [projectid]);


    const fetchtabledata = async (tablename, recordLimit = limit) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectid}/tables?table=${tablename}&limit=${recordLimit}`, {
                credentials: "include",
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to fetch table data");
            setTableData(data);
        } catch (err) {
            console.error("Error fetching table data:", err);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-accent/20 to-secondary/30">
            <Header />
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
                <Sidebar active={page} onSelectPage={(newPage) => setpage(newPage)} />

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
                            }
                            }
                        />
                    </div>
                    <div className="filter h-23 items-center flex sm:p-4 gap-4">
                        <Funnel />
                        Filters:
                    </div>
                    <div className="mockbutton  h-28 gap-2 bg-white items-center flex-col  max-[510]:h-65   min-[820]:flex-row min-[820]:h-19 flex p-4 justify-between">
                        <div className="frontbtn flex flex-row gap-2 max-[510]:flex-col max-[510]:w-full max-[510]:gap-3">
                            <Button className=" max-[510]:w-full hover:cursor-pointer">+ Insert Row</Button>

                       


                            <Button className="text-black bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer" onClick={async () => {
                                if (deletebtn) {
                                    await handledelete();
                                }
                                setdeletebtn(!deletebtn);
                            }}><Trash />{!deletebtn ? "Delete" : `Selected: ${deleteRows.length}`}</Button>
                        </div>
                        <div className="endbtn flex gap-4 max-[510]:gap-2 max-[510]:flex-col max-[510]:w-full">
                            <Button className="text-black bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer"><Sparkles />Generate Mock Data</Button>
                            <Button className="text-black bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer"><Download /> Export</Button>
                        </div>
                    </div>
                    {/* Table here */}
                    <div className="flex-1 min-h-0 flex flex-col">
                        {loading ? <div>Loading table</div> :
                            tableData ? <div className="w-full overflow-x-auto max-w-full overflow-y-auto h-full">
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
                                {!isExpanded && tableData && tableData.rows.length === limit && (
                                    <div className="flex justify-center mt-3">
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

                                :
                                <div className="text-gray-500 italic">No table selected</div>
                        }

                    </div>
                    </>
                    :page=="query"?
                    <>
                      <div className="flex flex-col h-full my-20">
                      <div className="bg-white rounded-xl shadow-lg px-8 py-10 mx-10 flex flex-col gap-30">
                        <div className="query_head flex flex-col gap-3">
                        <p>Ask Your Database</p>
                             <textarea 
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Ask your database in plain English... e.g., 'Show all employees in HR department'"
                            className=" min-h-[48px] max-h-[120px] overflow-auto resize-none text-gray-800"
                            rows={2}
                            style={{ transition: "height 0.2s" }}
                          />
                        
                        </div>
                        
                        <div className="flex justify-between ">
                        <div className="flex flex-wrap gap-3 mb-6 w-4/5">
                          {[
                            "Show all employees in Engineering department",
                            "Find employees with salary greater than $80,000",
                            "Count total employees by department",
                            "Show recent performance reviews",
                          ].map((ex) => (
                            <button
                              key={ex}
                              type="button"
                              className="flex items-center gap-2 bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer text-gray-800 text-sm font-medium px-4 py-2 rounded-md border-gray-200 shadow-sm"
                              onClick={() => setQuery(ex)}
                            >
                                <Sparkles  className="w-4 h-4 text-gray-500"/>
                           
                              {ex}
                            </button>
                          ))}
                        </div>
                        <div className="runbtn flex flex-col justify-end">
                         <Button className=" max-[510]:w-full hover:cursor-pointer">
                            <Send className="w-5 h-5 text-white"  />
                            Run Query
                         </Button>
                        </div>
                        
                        </div>
                      </div>
                      <div className="text-center mt-16 text-gray-500">
                       
                        <div className="text-lg font-medium flex justify-center items-center flex-col">
                             <Sparkles  className="w-10 h-10 text-gray-500"/>
                          Ask anything about your data<br />
                          <span className="text-base text-gray-400">
                            Use natural language to query your database. No SQL knowledge required.
                          </span>
                        </div>
                      </div>
                    </div>
                    </>
                    :page=="history"?<>
                        History Page
                    </> :
                    page=="optimization"?<>
                        Optimization Page
                    </> :
                    page=="schema"?<>
                    <SchemaPage />
                    </>
                    :
                    <>
                    </>
                
                   }
                    
                </div>
              
            </div>
            
        </div> 
    );
}