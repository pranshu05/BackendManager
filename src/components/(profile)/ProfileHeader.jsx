"use client";

import { Database, X } from "lucide-react";

export default function ProfileHeader() {
  return (
    <header className="flex items-center justify-between mb-8">
      <div className="flex items-center space-x-2">
        <div className="p-2 bg-[#1e4a8a] rounded-xl">
          <Database className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#1e4a8a]">DBuddy</h1>
          <p className="text-sm text-[#1e4a8a]">Your Database Companion</p>
        </div>
      </div>
      <button
        onClick={() => (window.location.href = "/dashboard")}
        className="p-2 rounded-full text-[#1e4a8a] hover:bg-gray-500/10 transition-colors cursor-pointer"
        aria-label="Close">
        <X className="w-6 h-6" />
      </button>
    </header>
  );
}
