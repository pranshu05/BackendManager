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
                text-gray-700 bg-sidebar border border-gray-300 rounded-md shadow-sm 
                ${!disabled && !isLoading ? 'hover:bg-gray-200 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px] justify-between`}
                disabled={disabled || isLoading}
            >
                <div className="flex items-center gap-2">
                  
                <span>{selectedOption}</span>
                </div>
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    <div className="py-1">
                        {options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleSelect(option)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <Download className="h-4 w-4" />
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