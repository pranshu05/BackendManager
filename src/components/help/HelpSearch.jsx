// Search component for filtering FAQs
"use client";

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function HelpSearch({ value, onChange }) {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
                type="text"
                placeholder="Search FAQs or type your question...."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-10 w-full"
            />
        </div>
    );
}

