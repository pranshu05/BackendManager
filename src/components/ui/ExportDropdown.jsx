"use client";
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Download } from 'lucide-react';

export default function ExportDropdown({ options, onSelect, className = '', disabled = false, isLoading = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState('Export Data');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (option) => {
        onSelect(option);
        setSelectedOption('Export Data');  // Reset to default text
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium 
                border rounded-md shadow-sm 
                ${!disabled && !isLoading ? '' : 'opacity-50 cursor-not-allowed'}
                focus:outline-none focus:ring-2 min-w-[150px] justify-between`}
                disabled={disabled || isLoading}
                style={{
                  background: "var(--accent)",
                  borderColor: "var(--border)",
                  color: "var(--text)"
                }}
                onMouseEnter={(e) => {
                  if (!disabled && !isLoading) {
                    e.currentTarget.style.background = "var(--primary)";
                    e.currentTarget.style.color = "var(--primary-contrast)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!disabled && !isLoading) {
                    e.currentTarget.style.background = "var(--accent)";
                    e.currentTarget.style.color = "var(--text)";
                  }
                }}
                onFocus={(e) => {
                  e.currentTarget.style.ringColor = "var(--primary)";
                }}
            >
                <div className="flex items-center gap-2">
                  
                <span>{selectedOption}</span>
                </div>
                <ChevronDown 
                  className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                  style={{ color: "var(--muted-text)" }}
                />
            </button>

            {isOpen && (
                <div 
                  className="absolute z-50 mt-1 w-full border rounded-md shadow-lg max-h-60 overflow-auto"
                  style={{
                    background: "var(--panel-bg)",
                    borderColor: "var(--border)",
                    boxShadow: "var(--shadow)"
                  }}
                >
                    <div className="py-1">
                        {options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleSelect(option)}
                                className="block w-full text-left px-4 py-2 text-sm"
                                style={{
                                  color: "var(--text)"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "var(--accent)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "transparent";
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <Download className="h-4 w-4" style={{ color: "var(--muted-text)" }} />
                                    <span>{option}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}