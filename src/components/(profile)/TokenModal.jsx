"use client";
import { useState } from "react";
import { X, Copy, Eye, EyeOff } from "lucide-react";

export default function TokenModal({ onClose }) {
    const [apiToken, setApiToken] = useState("");
    const [loadingToken, setLoadingToken] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [hasGenerated, setHasGenerated] = useState(false);

    const handleGenerateToken = async () => {
        setLoadingToken(true);
        try {
            const res = await fetch("/api/auth/get-token", {
                method: "POST",
                credentials: "include",
            });

            if (res.ok) {
                const data = await res.json();
                setApiToken(data.token);
                setHasGenerated(true);
            } else {
                const error = await res.json();
                alert(`Error: ${error.error || "Failed to generate token"}`);
            }
        } catch (error) {
            console.error("Can't generate token", error);
            alert("Failed to generate token. Please try again.");
        } finally {
            setLoadingToken(false);
        }
    };

    const handleCopyToken = () => {
        navigator.clipboard.writeText(apiToken);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="bg-[#1e4a8a] p-4 rounded-t-xl flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">API Token</h3>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 p-1 rounded-full transition cursor-pointer">
                        <X className="w-5 h-5 cursor-pointer" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {!hasGenerated ? (
                        <div className="text-center space-y-4">
                            <p className="text-gray-600">
                                Generate a Bearer token for API access. This token will expire in 7 days.
                            </p>
                            <button
                                onClick={handleGenerateToken}
                                disabled={loadingToken}
                                className="w-full bg-[#1e4a8a] text-white py-3 rounded-lg hover:bg-[#1e3a6a] transition font-semibold disabled:opacity-50 cursor-pointer">
                                {loadingToken ? "Generating..." : "Generate Token"}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-[#1e4a8a]">Bearer Token</span>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setShowToken(!showToken)}
                                            className="text-[#1e4a8a] hover:bg-blue-100 p-1 rounded transition cursor-pointer"
                                            title={showToken ? "Hide" : "Show"}>
                                            {showToken ? (
                                                <EyeOff className="w-4 h-4 cursor-pointer" />
                                            ) : (
                                                <Eye className="w-4 h-4 cursor-pointer" />
                                            )}
                                        </button>
                                        <button
                                            onClick={handleCopyToken}
                                            className="text-[#1e4a8a] hover:bg-blue-100 p-1 rounded transition cursor-pointer"
                                            title="Copy">
                                            <Copy className="w-4 h-4 cursor-pointer" />
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-white rounded p-3 border border-gray-300 break-all font-mono text-xs max-h-24 overflow-y-auto">
                                    {showToken ? apiToken : "•".repeat(40)}
                                </div>
                            </div>

                            {copySuccess && (
                                <div className="text-center text-sm font-medium text-green-600">
                                    Copied to clipboard!
                                </div>
                            )}

                            <div className="text-center text-sm text-gray-600">
                                <span className="font-medium">Expires in: </span>
                                <span className="text-[#1e4a8a] font-bold">7 days</span>
                            </div>

                            <button
                                onClick={handleGenerateToken}
                                disabled={loadingToken}
                                className="w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition font-semibold disabled:opacity-50 cursor-pointer">
                                {loadingToken ? "Generating..." : "Regenerate Token"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}