"use client";

import { LogOut } from "lucide-react";

export default function LogoutButton({ onLogout }) {
  return (
    <div className="flex justify-center pt-6 pb-12">
      <button
        onClick={onLogout}
        className="bg-red-600 hover:bg-red-700 text-white font-semibold px-12 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-colors">
        <LogOut className="w-5 h-5" />
        Logout
      </button>
    </div>
  );
}
