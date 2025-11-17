// FAQ list component with categories and expandable items
"use client";

import { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function FAQList({ faqs, searchQuery }) {
    const [expandedId, setExpandedId] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');
    const [voteCounts, setVoteCounts] = useState({});
    const [userVotes, setUserVotes] = useState({});
    const [voting, setVoting] = useState(null);
    
    const categories = [
    'All',
    'Account Issues',
    'Project Management',
    'Tables & Schema',
    'Query',
    'API & Auth',
    ];
    
    // Fetch votes on mount
    useEffect(() => {
        fetchVotes();
    }, []);
    
    const fetchVotes = async () => {
        try {
            const res = await fetch('/api/help/votes');
            const data = await res.json();
            if (data.ok) {
                setVoteCounts(data.voteCounts || {});
                setUserVotes(data.userVotes || {});
            }
        } catch (error) {
            console.error('Error fetching votes:', error);
        }
    };
    
    const handleVote = async (questionId, isHelpful) => {
        setVoting(questionId);
        try {
            const res = await fetch('/api/help/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionId, isHelpful })
            });
            
            const data = await res.json();
            if (data.ok) {
                // Refresh votes
                await fetchVotes();
            } else {
                console.error('Vote failed:', data.error);
            }
        } catch (error) {
            console.error('Error voting:', error);
        } finally {
            setVoting(null);
        }
    };
    
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
        <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Frequently Asked Questions</h2>
            
            {/* Category Tabs */}
            <div className="flex gap-1.5 flex-wrap">
                {categories.map((category) => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all duration-300 ${
                            activeCategory === category
                                ? 'bg-primary text-white shadow-md shadow-primary/30'
                                : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-sm border border-gray-200'
                        }`}
                    >
                        {category}
                    </button>
                ))}
            </div>
            
            {/* FAQ Items */}
            <div className="space-y-2">
                {filteredFaqs.length === 0 ? (
                    <div className="text-center py-6 bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-sm">No FAQs found matching your search.</p>
                    </div>
                ) : (
                    filteredFaqs.slice(0, 5).map((faq) => (
                        <div
                            key={faq.id}
                            className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden ${
                                expandedId === faq.id ? 'ring-1 ring-primary/20' : ''
                            }`}
                        >
                            <div
                                className="flex items-center justify-between cursor-pointer p-3 hover:bg-gray-50/50 transition-colors"
                                onClick={() => toggleExpand(faq.id)}
                            >
                                <h3 className="font-semibold text-gray-900 flex-1 text-sm">
                                    {faq.question}
                                </h3>
                                <div className={`ml-3 p-1 rounded-full transition-all duration-300 ${
                                    expandedId === faq.id ? 'bg-primary/10' : 'bg-gray-100'
                                }`}>
                                    {expandedId === faq.id ? (
                                        <ChevronUp className="w-3.5 h-3.5 text-primary" />
                                    ) : (
                                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                    )}
                                </div>
                            </div>
                            
                            {expandedId === faq.id && (
                                <div className="px-3 pb-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <p className="text-gray-700 text-sm leading-relaxed">{faq.answer}</p>
                                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                                        <span className="text-xs text-gray-500 font-medium">Was this helpful?</span>
                                        <button 
                                            onClick={() => handleVote(faq.id, true)}
                                            disabled={voting === faq.id}
                                            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                                                userVotes[faq.id] === true
                                                    ? 'bg-green-100 text-green-700 font-semibold'
                                                    : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                                            } ${voting === faq.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <ThumbsUp className="w-3 h-3" />
                                            <span>Yes ({voteCounts[faq.id]?.helpful || 0})</span>
                                        </button>
                                        <button 
                                            onClick={() => handleVote(faq.id, false)}
                                            disabled={voting === faq.id}
                                            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                                                userVotes[faq.id] === false
                                                    ? 'bg-red-100 text-red-700 font-semibold'
                                                    : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                                            } ${voting === faq.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <ThumbsDown className="w-3 h-3" />
                                            <span>No ({voteCounts[faq.id]?.notHelpful || 0})</span>
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