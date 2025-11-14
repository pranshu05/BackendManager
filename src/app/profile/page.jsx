"use client";

import { useState, useEffect } from "react";
import {
  Database,
  LogOut,
  UserCog,
  Search,
  Briefcase,
  SquarePen,
  X,
  Key,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";

export default function ProfilePage(){
  const [role, setRole] = useState("Student");
  const [showTokenCard, setShowTokenCard] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [loadingToken, setLoadingToken] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  useEffect(() => {
    const fetchRole = async () => {
      try {
        const res = await fetch("/api/profile");
        if(res.ok){
          const data = await res.json();
          if(data.profile && data.profile.role){
            setRole(data.profile.role);
          }
        }
      }catch(error){
        console.error("Error fetching role:", error);
      }
    };
    fetchRole();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  const ProfileLink = ({
    icon: Icon,
    title,
    subtitle,
    href,
    hasEdit = false,
  }) => {
    return (
      <div className="flex items-center justify-between w-full rounded-lg p-3 hover:bg-gray-100 transition">
        <div className="flex items-center space-x-4">
          <Icon className="w-6 h-6 text-[#1e4a8a] flex-shrink-0"/>

          {!hasEdit ? (
            <button
              onMouseEnter={(e) =>
                e.currentTarget.classList.add("hover-active")
              }
              onMouseLeave={(e) =>
                e.currentTarget.classList.remove("hover-active")
              }
              onClick={() => (window.location.href = href)}
              className="cursor-pointer text-left">
              <h2 className="text-lg font-semibold text-[#1e4a8a] hover:underline">
                {title}
              </h2>
              <p className="text-sm text-gray-600">{subtitle}</p>
            </button>
          ) : (
            <div
              onMouseEnter={(e) =>
                e.currentTarget.classList.add("hover-active")
              }
              onMouseLeave={(e) =>
                e.currentTarget.classList.remove("hover-active")
              }
            >
              <h2 className="text-lg font-semibold text-[#1e4a8a]">{title}</h2>
              <p className="text-sm text-gray-600">{subtitle}</p>
            </div>
          )}
        </div>

        {hasEdit && (
          <button
            onClick={() => (window.location.href = href)}
            className="cursor-pointer text-[#1e4a8a] hover:text-[#1e3a6a] p-1">
            <SquarePen className="w-5 h-5"/>
          </button>
        )}
      </div>
    );
  };

  const handleGenerateToken = async () => {
    setLoadingToken(true);
    try {
      const res = await fetch("/api/auth/get-token", {
        method: "POST",
        credentials: "include",
      });

      if(res.ok){
        const data = await res.json();
        setApiToken(data.token);
        setShowTokenCard(true);
      }else{
        const error = await res.json();
        alert(`Error: ${error.error || "Failed to generate token"}`);
      }
    }catch(error){
      console.error("Can't generate token", error);
      alert("Failed to generate token. Please try again.");
    }finally{
      setLoadingToken(false);
    }
  };

  const handleCopyToken =()=>{
    navigator.clipboard.writeText(apiToken);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    /*logo*/
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-blue-100 relative p-6">
      <header className="absolute top-6 left-6">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-[#1e4a8a] rounded-xl">
            <Database className="w-6 h-6 text-white"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1e4a8a]">DBuddy</h1>
            <p className="text-sm text-[#1e4a8a]">Your Database Companion</p>
          </div>
        </div>
      </header>

      {/* X button */}
      <button
        onClick={() => (window.location.href = "/dashboard")}
        className="absolute top-6 right-6 p-2 rounded-full text-[#1e4a8a] hover:bg-gray-500/10 transition-colors cursor-pointer"
        aria-label="Close">
        <X className="w-6 h-6"/>
      </button>

      <main className="flex flex-col items-center justify-center min-h-screen w-full">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center space-y-4 mb-10">
            <div className="w-28 h-28 rounded-full bg-[#1e4a8a] flex items-center justify-center border-2 border-white shadow-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-16 h-16">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-[#1e4a8a]">Profile</h1>
          </div>

          <div className="space-y-6">
            <ProfileLink
              icon={UserCog}
              title="Personal Information"
              subtitle="Address & Contact and Personal Information"
              href="/personalinformationpage"/>
            <ProfileLink
              icon={Search}
              title="Password"
              subtitle="Account Password"
              hasEdit={true}
              href="/change-password"/>
            <ProfileLink
              icon={Briefcase}
              title="Role"
              subtitle={role || "Student"}
              hasEdit={true}
              href="/rolepage"/>
            <div className="flex items-center justify-between w-full rounded-lg p-3 hover:bg-gray-100 transition">
              <div className="flex items-center space-x-4">
                <Key className="w-6 h-6 text-[#1e4a8a] flex-shrink-0" />
                <div>
                  <h2 className="text-lg font-semibold text-[#1e4a8a]">API Token</h2>
                  <p className="text-sm text-gray-600">Generate Bearer token for API access</p>
                </div>
              </div>
              <button
                onClick={handleGenerateToken}
                disabled={loadingToken}
                className="cursor-pointer text-white bg-[#1e4a8a] hover:bg-[#1e3a6a] px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {loadingToken ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/*logout btn*/}
          <div className="flex justify-center pt-12">
            <button
              onClick={handleLogout}
              className="bg-[#1e4a8a] hover:bg-[#1e3a6a] text-white font-semibold px-8 py-3 rounded-lg shadow-lg flex items-center space-x-2 transition-colors">
              <span>LOGOUT</span>
              <LogOut className="w-5 h-5"/>
            </button>
          </div>
        </div>
      </main>

      {/*token card*/}
      {showTokenCard && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
          <div className="bg-gradient-to-b from-yellow-50 to-blue-50 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-md border-2 border-[#1e4a8a]/30 pointer-events-auto">
            <div className="bg-[#1e4a8a] p-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">API Token</h3>
              <button
                onClick={() => setShowTokenCard(false)}
                className="text-white hover:bg-white/20 p-1 rounded-full transition">
                <X className="w-5 h-5 cursor-pointer"/>
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* displaying token */}
              <div className="bg-white/80 rounded-lg p-3 border border-[#1e4a8a]/20 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#1e4a8a]">Bearer Token</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="text-[#1e4a8a] hover:bg-blue-100 p-1 rounded transition"
                      title={showToken ? "Hide" : "Show"}>
                      {showToken ? (
                        <EyeOff className="w-4 h-4 cursor-pointer"/>
                      ):(
                        <Eye className="w-4 h-4 cursor-pointer"/>
                      )}
                    </button>
                    <button
                      onClick={handleCopyToken}
                      className="text-[#1e4a8a] hover:bg-blue-100 p-1 rounded transition"
                      title="Copy">
                      <Copy className="w-4 h-4 cursor-pointer"/>
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded p-2 border border-[#1e4a8a]/30 break-all font-mono text-xs max-h-24 overflow-y-auto">
                  {showToken ? apiToken : "•".repeat(40)}
                </div>
                {copySuccess && (
                  <div className="mt-2 text-center text-xs font-medium">Copied to clipboard!</div>
                )}
                <div className="mt-3 text-center text-xs text-gray-600">
                  <span className="font-medium">Expires in:</span>
                  <span className="text-[#1e4a8a] font-bold">7 days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
