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
} from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUserData();
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

// Example ProfileLink component update inside profile/page.jsx (if needed)
function ProfileLink({ icon: Icon, title, subtitle, hasEdit = false, onEdit }) {
  return (
    <div className="flex items-center justify-between bg-white/0 p-2">
      <div className="flex items-start space-x-4">
        <Icon className="w-6 h-6 text-[#1e4a8a] mt-1 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-semibold text-[#1e4a8a]">{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
      </div>

      {hasEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (typeof onEdit === "function") onEdit();
          }}
          className="text-[#1e4a8a] hover:text-[#16386f] cursor-pointer p-2 rounded"
          aria-label={`Edit ${title}`}
        >
          <SquarePen className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

  return (
    /*logo*/
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-blue-100 relative p-6">
      <header className="absolute top-6 left-6">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-[#1e4a8a] rounded-xl">
            <Database className="w-6 h-6 text-white" />
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
        <X className="w-6 h-6" />
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
              subtitle="Address & Contact and Personal Information" />
              <ProfileLink
                icon={Search}
                title="Password"
                subtitle="Account Password"
                hasEdit={true}
                onEdit={() => (window.location.href = "/change-password")}/>
            <ProfileLink
              icon={Briefcase}
              title="Role"
              subtitle={user ? user.role : "Student"}
              hasEdit={true}/>
          </div>

        {/*logout btn*/}
          <div className="flex justify-center pt-12">
            <button
              onClick={handleLogout}
              className="bg-[#1e4a8a] hover:bg-[#1e3a6a] text-white font-semibold px-8 py-3 rounded-lg shadow-lg flex items-center space-x-2 transition-colors">
              <span>LOGOUT</span>
              <LogOut className="w-5 h-5" />
           </button>
          </div>
        </div>

      </main>
    </div>
  );
}