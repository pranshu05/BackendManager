"use client";

import ForgotPwd from "@/components/(auth)/forgotpwd";
import { Database, X } from "lucide-react";

export default function ChangePasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-blue-100 relative p-6">
      <header className="absolute top-6 left-6">
        <div className="flex items-center space-x-2">
          <div className="p-3 bg-[#1e4a8a] rounded-xl">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1e4a8a]">DBuddy</h1>
            <p className="text-sm text-[#1e4a8a]">Your Database Companion</p>
          </div>
        </div>
      </header>

        {/* X button */}
      <button
        onClick={() => (window.location.href = "/profile")}
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
            <h1 className="text-3xl font-semibold text-[#1e4a8a]">Change Your Password</h1>
          </div>

          {/* rendering forgotpwd function again (cause the work is same) :)) */}
          <ForgotPwd />
        </div>
      </main>
    </div>
  );
}