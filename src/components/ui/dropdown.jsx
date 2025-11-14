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
        className="flex items-center gap-2 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 min-w-[150px] justify-between"
        style={{
          background: "var(--panel-bg)",
          borderColor: "var(--border)",
          color: "var(--text)"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--accent)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--panel-bg)";
        }}
        onFocus={(e) => {
          e.currentTarget.style.ringColor = "var(--primary)";
        }}
      >
        <span className="truncate" style={{ color: selected ? "var(--text)" : "var(--muted-text)" }}>
          {selected || "Select an option"}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
          style={{ color: "var(--muted-text)" }}
        />
      </button>

      {isOpen && items.length > 0 && (
        <div 
          className="absolute z-50 mt-1 w-full border rounded-md shadow-lg max-h-60 overflow-auto"
          style={{
            background: "var(--panel-bg)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow)"
          }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                onSelect(item);
                setIsOpen(false);
              }}
              className="px-4 py-2 cursor-pointer"
              style={{
                background: item === selected ? "var(--accent)" : "transparent",
                color: item === selected ? "var(--text)" : "var(--text)",
                fontWeight: item === selected ? "500" : "400"
              }}
              onMouseEnter={(e) => {
                if (item !== selected) {
                  e.currentTarget.style.background = "var(--accent)";
                }
              }}
              onMouseLeave={(e) => {
                if (item !== selected) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
