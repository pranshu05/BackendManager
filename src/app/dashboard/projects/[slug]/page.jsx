"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/ui/header";
import Sidebar from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import SchemaPage from "@/components/(projects)/schema";
import Optimization from "@/components/(projects)/optimization";
import Query from "@/components/(projects)/query";
import TableExplorer from "@/components/(projects)/table"; // <-- 1. Import new component
import History from "@/components/(projects)/history"; // <-- 2. Import new component

import {
  ArrowLeft,
  Database,
  CheckCircle,
  AlertOctagon, // Renamed from AlertCircle for consistency
  XIcon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Added DialogDescription
  DialogFooter,
} from "@/components/ui/dialog";

// --- 3. Added safeJsonFetch Helper ---
async function safeJsonFetch(url, options) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();

    if (!res.ok) {
      try {
        const jsonError = JSON.parse(text);
        throw new Error(jsonError.error || jsonError.message || "An API error occurred");
      } catch {
        throw new Error(text || `HTTP error: ${res.status}`);
      }
    }

    if (res.status === 204 || text.length === 0) return null;

    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response from server");
    }
  } catch (err) {
    throw err;
  }
}

// --- 4. Added ConfirmDialog Helper ---
function ConfirmDialog({ isOpen, title, message, onCancel, onConfirm, isDestructive = false }) {
  if (!isOpen) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant={isDestructive ? "destructive" : "default"} onClick={onConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- 5. Added NotificationBar Helper ---
function NotificationBar({ message, type, onDismiss }) {
  if (!message) return null;

  const isError = type === "error";

  return (
    <div
      className={`fixed top-20 right-6 z-50 p-4 rounded-md shadow-lg max-w-sm ${
        isError ? "bg-red-50 border border-red-300" : "bg-green-50 border border-green-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={isError ? "text-red-500" : "text-green-500"}>
          {isError ? <AlertOctagon className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
        </div>
        <div className={isError ? "text-red-700" : "text-green-700"}>
          <p className="font-medium">{isError ? "Error" : "Success"}</p>
          <p>{message}</p>
        </div>
        <button onClick={onDismiss} className={isError ? "text-red-700" : "text-green-700"}>
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}


export default function DashboardPage() {
  const params = useParams();
  const projectid = params.slug;
  const [projects, setProjects] = useState([]);
  const [projectdetail, setprojectdetail] = useState({});

  // Page state
  const [page, setpage] = useState(() => {
    try {
      if (typeof window !== "undefined" && projectid) {
        const saved = localStorage.getItem(`dashboard:page:${projectid}`);
        return saved || "table";
      }
    } catch (e) {
      // ignore
    }
    return "table"; // Default to table
  });

  // --- 6. Added Notification and Confirm States/Helpers ---
  const [notification, setNotification] = useState({ message: "", type: "success" });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    isDestructive: false,
  });

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: "", type: "success" }), 4000);
  };

  const showConfirm = ({ title, message, onConfirm, isDestructive = false }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
        onConfirm();
      },
      isDestructive,
    });
  };

  const closeConfirm = () => {
    setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: () => {} });
  };
  
  // State for passing query title from History to Query
  const [queryToPass, setQueryToPass] = useState(null);

  // Save page state to localStorage
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && projectid) {
        const saved = localStorage.getItem(`dashboard:page:${projectid}`);
        if (saved && saved !== page) setpage(saved);
      }
    } catch (e) {
      // ignore
    }
  }, [projectid, page]); // Added 'page' to dependency array

  const handleSetPage = (newPage) => {
    setpage(newPage);
    try {
      if (typeof window !== "undefined" && projectid)
        localStorage.setItem(`dashboard:page:${projectid}`, newPage);
    } catch (e) {
      // ignore storage errors
    }
  };
  
  // Fetch project list
  useEffect(() => {
    const fetchProjectsData = async () => {
      try {
        // Use safeJsonFetch
        const data = await safeJsonFetch("/api/projects", { cache: "no-store" });
        setProjects(data.projects || []);
        console.log("Fetched projects: ", data);
      } catch (err) {
        console.error("Error fetching projects:", err);
        showNotification("Error fetching projects: " + (err?.message || err), "error");
        setProjects([]);
      }
    };
    fetchProjectsData();
  }, []); // Empty dependency array, runs once

  // Set project detail when projects or projectid changes
  useEffect(() => {
    if (projects.length > 0) {
      const proj = projects.find((p) => String(p.id) === String(projectid));
      if (proj) {
        setprojectdetail(proj);
      }
    }
  }, [projects, projectid]);


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-accent/20 to-secondary/30">
      <Header />
      
      {/* --- 7. Added Notification and Confirm Dialogs to JSX --- */}
      <NotificationBar
        message={notification.message}
        type={notification.type}
        onDismiss={() => setNotification({ message: "", type: "success" })}
      />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onCancel={closeConfirm}
        onConfirm={confirmDialog.onConfirm}
        isDestructive={confirmDialog.isDestructive}
      />

      {/* Header DB */}
      <div className="db bg-white w-full flex items-center h-26 gap-4 px-6">
        <div className="db_left h-26 flex justify-center items-center">
          <ArrowLeft
            className="hover:cursor-pointer"
            onClick={() => {
              globalThis.location.href = "/dashboard";
            }}
          />
        </div>
        <div className="db_right w-full h-26 flex gap-2">
          <div className="db_icon flex items-center">
            <div className="p-2 bg-slate-300 flex justify-center items-center rounded-xl w-12 h-12">
              <Database />
            </div>
          </div>
          <div className="details flex flex-col justify-center">
            <span className=" text-xs md:text-xl">
              {projectdetail.project_name}
            </span>
            <span className="text-gray-600 text-xs md:text-sm">
              {projectdetail.description}
            </span>
            <span className="text-xs text-gray-600">
              {" "}
              📊 {projectdetail.table_count || 0} Tables
            </span>
          </div>
        </div>
      </div>
      
      <div className="content flex flex-row w-full flex-1 min-h-0">
        <Sidebar
          active={page}
          onSelectPage={(newPage) => handleSetPage(newPage)}
        />

        <div className="rightcontent flex flex-col w-full border-1 overflow-x-hidden overflow-y-scroll min-h-0 h-screen">
          
          {/* --- 8. Replaced inline logic with components --- */}
          
          {page === "table" ? (
            <TableExplorer 
                safeJsonFetch={safeJsonFetch} 
                showNotification={showNotification} 
                showConfirm={showConfirm} 
            />
          ) : page === "query" ? (
            <Query 
                initialQuery={queryToPass} 
                onQueryMounted={() => setQueryToPass(null)} 
            />
          ) : page === "history" ? (
            <History
                safeJsonFetch={safeJsonFetch}
                showNotification={showNotification}
                showConfirm={showConfirm}
                handleSetPage={handleSetPage}
                setQueryToPass={setQueryToPass}
            />
          ) : page === "optimization" ? (
            <Optimization />
          ) : page === "schema" ? (
            <SchemaPage />
          ) : (
            <div className="p-6">Select a page from the sidebar.</div>
          )}
        </div>
      </div>
    </div>
  );
}