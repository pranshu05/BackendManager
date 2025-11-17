// Search component for filtering FAQs
"use client";

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function HelpSearch({ value, onChange }) {
    return (
        <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-primary transition-colors" />
            <Input
                type="text"
                placeholder="Search FAQs or type your question...."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-10 pr-3 h-9 text-sm rounded-xl border-2 border-gray-200 focus:border-primary bg-white shadow-sm hover:shadow-md transition-all duration-300"
            />
        </div>
    );
}