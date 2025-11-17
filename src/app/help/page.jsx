// Help & Support Center main page
"use client";

import { useState, useEffect } from 'react';
import Header from '@/components/ui/header';
import HelpSidebar from '@/components/help/HelpSidebar';
import HelpSearch from '@/components/help/HelpSearch';
import FAQList from '@/components/help/FAQList';
import SubmitTicketForm from '@/components/help/SubmitTicketForm';

export default function HelpPage() {
    const [faqs, setFaqs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFaqs();
    }, []);

    const fetchFaqs = async () => {
        try {
            const res = await fetch('/api/help/faqs');
            const data = await res.json();
            if (data.ok) {
                setFaqs(data.faqs || []);
            }
        } catch (error) {
            console.error('Error fetching FAQs:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Header />
            <div className="flex flex-col lg:flex-row">
                {/* Left Sidebar */}
                <div className="lg:w-56 flex-shrink-0">
                    <HelpSidebar />
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
                    {/* Center Content */}
                    <div className="flex-1 space-y-4">
                        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-5 text-white shadow-lg">
                            <h1 className="text-2xl font-bold mb-1">
                                Help & Support Center
                            </h1>
                            <p className="text-white/90 text-sm">
                                Find answers or reach out for assistance
                            </p>
                        </div>

                        <HelpSearch value={searchQuery} onChange={setSearchQuery} />

                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Loading FAQs...</div>
                        ) : (
                            <FAQList faqs={faqs} searchQuery={searchQuery} />
                        )}
                    </div>

                    {/* Right Panel - Submit Form */}
                    <div className="lg:w-80 flex-shrink-0">
                        <SubmitTicketForm />
                    </div>
                </div>
            </div>
        </div>
    );
}