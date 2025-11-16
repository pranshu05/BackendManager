// FAQ list component with categories and expandable items
"use client";

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function FAQList({ faqs, searchQuery }) {
    const [expandedId, setExpandedId] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');
    
    const categories = ['All', 'Account Issues', 'Billing', 'Technical'];
    
    // Filter FAQs by category and search query
    const filteredFaqs = useMemo(() => {
        let filtered = faqs;
        
        if (activeCategory !== 'All') {
            filtered = filtered.filter(faq => faq.category === activeCategory);
        }
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                faq => 
                    faq.question.toLowerCase().includes(query) ||
                    faq.answer.toLowerCase().includes(query)
            );
        }
        
        return filtered;
    }, [faqs, activeCategory, searchQuery]);
    
    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };
    
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Frequently Asked Questions</h2>
            
            {/* Category Tabs */}
            <div className="flex gap-2 border-b border-gray-300">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeCategory === category
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        {category}
                    </button>
                ))}
            </div>
            
            {/* FAQ Items */}
            <div className="space-y-3">
                {filteredFaqs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No FAQs found matching your search.
                    </div>
                ) : (
                    filteredFaqs.map((faq) => (
                        <div
                            key={faq.id}
                            className="bg-white border border-gray-300 rounded-lg p-4"
                        >
                            <div
                                className="flex items-center justify-between cursor-pointer"
                                onClick={() => toggleExpand(faq.id)}
                            >
                                <h3 className="font-medium text-gray-900 flex-1">
                                    {faq.question}
                                </h3>
                                {expandedId === faq.id ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                            </div>
                            
                            {expandedId === faq.id && (
                                <div className="mt-4 space-y-3">
                                    <p className="text-gray-700">{faq.answer}</p>
                                    <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
                                        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                                            <ThumbsUp className="w-4 h-4" />
                                            <span>Yes ({faq.helpful || 0})</span>
                                        </button>
                                        <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                                            <ThumbsDown className="w-4 h-4" />
                                            <span>No ({faq.notHelpful || 0})</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

