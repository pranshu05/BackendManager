"use client";
import { useState, useEffect} from "react";
import { useParams } from "next/navigation";
import Header from "@/components/ui/header";
import Sidebar from "../../../../components/ui/sidebar";
import { Button } from "@/components/ui/button";
import Dropdown from "@/components/ui/dropdown";
import { ArrowLeft, Database, Funnel, PencilLine, Trash, Download, Sparkles } from "lucide-react";

export default function DashboardPage() {
  const params = useParams();
  const projectid = params.slug;
  const [projectdetail,] = useState({ name: "Employee Management System", description: "Database to manage employee records", tables: '5' });
  const [page, setpage] = useState("table");
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [tablelist, settablelist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [limit, ] = useState(5);
  const [isExpanded, setIsExpanded] = useState(false);
  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await fetch(`/api/projects/${projectid}/tables`);
        const data = await res.json();
        if (!res.ok) {
          console.error("Failed to fetch tables:", data.error);
          return;
        }
        console.log("Fetched tables:", data.tables);
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
      const res = await fetch(`/api/projects/${projectid}/tables?table=${tablename}&limit=${recordLimit}`)
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch table data");
      setTableData(data);
    } catch (err) {
      console.error("Error fetching table data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Table data fetched is: ", tableData);
  }, [tableData])

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
            <span className=" text-xs  md:text-xl">{projectdetail.name}</span>
            <span className="text-gray-600  text-xs  md:text-sm">{projectdetail.description}</span>
            <span className="text-xs text-gray-600"> 📊 {projectdetail.tables} Tables</span>
          </div>

        </div>

      </div>
  <div className="content flex flex-row w-full flex-1 min-h-0">
        <Sidebar active={page} onSelectPage={(newPage) => setpage(newPage)} />
  {page == "table" ? <div className="rightcontent flex flex-col w-full border-1 overflow-x-hidden min-h-0">
          <div className="table_select h-14 flex flex-row items-center bg-white sm:p-4 gap-2 max-[510]:flex-col max-[510]:h-25">
            Table Explorer
            <Dropdown
              items={tablelist}
              selected={selectedTable}
              onSelect={(t) => {
                setSelectedTable(t)
                fetchtabledata(t);
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
              <Button className="text-black bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer"><PencilLine /> Update</Button>
              <Button className="text-black bg-sidebar border-1 hover:bg-gray-300 hover:cursor-pointer"><Trash /> Delete</Button>
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
                            {tableData.columns.map((col) => (
                              <td key={col.name} className="px-4 py-2 text-center whitespace-nowrap">
                                {String(row[col.name] ?? "")}
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
        </div> : <></>}
      </div>
    </div>
  );
}