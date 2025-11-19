"use client";

import React, { useState } from 'react';
import Header from '@/components/ui/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HelpCircle, MessageSquare } from 'lucide-react';
import FAQsSection from '@/components/(help)/FAQsSection';
import SupportSection from '@/components/(help)/SupportSection';

export default function HelpPage() {
    const [activeTab, setActiveTab] = useState('faqs');

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="container mx-auto px-4 py-8 max-w-6xl">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-foreground mb-2">Help & Support</h1>
                    <p className="text-muted-foreground">
                        Find answers to common questions or get in touch with our support team
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="faqs" className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4" />
                            FAQs & Tutorials
                        </TabsTrigger>
                        <TabsTrigger value="support" className="flex items-center gap-2">
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