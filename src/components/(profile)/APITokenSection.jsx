"use client";

import { Key } from "lucide-react";

export default function APITokenSection({ onGenerateToken }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-[#1e4a8a]" />
          <div>
            <h3 className="text-xl font-bold text-[#1e4a8a]">API Token</h3>
            <p className="text-sm text-gray-600">Generate Bearer token for API access</p>
          </div>
        </div>
        <button
          onClick={onGenerateToken}
          className="bg-[#1e4a8a] hover:bg-[#1e3a6a] text-white px-6 py-2 rounded-lg transition-colors font-semibold cursor-pointer">
          Generate Token
        </button>
      </div>
    </div>
  );
}
