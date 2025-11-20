"use client";

import React, { useState } from 'react';
import Header from '@/components/ui/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCircle, MessageSquare } from 'lucide-react';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import FAQsSection from '@/components/(help)/FAQsSection';
import SupportSection from '@/components/(help)/SupportSection';

export default function HelpPage() {
    const [activeTab, setActiveTab] = useState('faqs');
    const router = useRouter();

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-4xl font-bold text-foreground mb-2">Help & Support</h1>
                        <p className="text-muted-foreground">
                            Find answers to common questions or get in touch with our support team
                        </p>
                    </div>

                    <button
                        aria-label="Close Help"
                        title="Close"
                        onClick={() => router.push('/dashboard')}
                        className="inline-flex cursor-pointer items-center justify-center rounded-md p-2 text-foreground hover:bg-muted transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="faqs" className="flex items-center gap-2 cursor-pointer">
                            <HelpCircle className="w-4 h-4" />
                            FAQs & Tutorials
                        </TabsTrigger>
                        <TabsTrigger value="support" className="flex items-center gap-2 cursor-pointer">
                            <MessageSquare className="w-4 h-4" />
                            Support Tickets
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="faqs" className="mt-0">
                        <FAQsSection />
                    </TabsContent>

                    <TabsContent value="support" className="mt-0">
                        <SupportSection />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}