"use client";

import { User } from "lucide-react";

export default function ProfileAvatar({ username, email }) {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="w-24 h-24 rounded-full bg-[#1e4a8a] flex items-center justify-center border-4 border-white shadow-lg mb-4">
        <User className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-[#1e4a8a]">{username || "User"}</h2>
      <p className="text-gray-600">{email}</p>
    </div>
  );
}
