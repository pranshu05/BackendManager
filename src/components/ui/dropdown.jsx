"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export default function Dropdown({ items = [], selected, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px] justify-between cursor-pointer"
            >
                <span className="truncate">{selected || "Select an option"}</span>
                <ChevronDown
                    className={`w-4 h-4 transition-transform ${isOpen ? "transform rotate-180" : ""
                        }`}
                />
            </button>

            {isOpen && items.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {items.map((item, index) => (
                        <div
                            key={index}
                            onClick={() => {
                                onSelect(item);
                                setIsOpen(false);
                            }}
                            className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${item === selected ? "bg-blue-50 text-blue-700 font-medium" : ""
                                }`}
                        >
                            {item}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
