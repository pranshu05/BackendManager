"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, HelpCircle, Youtube } from 'lucide-react';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-border last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-4 px-2 text-left hover:bg-muted/50 transition-colors rounded-lg cursor-pointer"
            >
                <span className="font-medium text-foreground pr-4">{question}</span>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
            </button>
            {isOpen && (
                <div className="px-2 pb-4 text-muted-foreground">
                    {answer}
                </div>
            )}
        </div>
    );
};

const FAQsSection = () => {
    const faqs = [
        {
            question: "What is DBuddy?",
            answer: "DBuddy is your ultimate backend manager that helps you manage databases, execute queries, and optimize your database operations with AI-powered assistance. It provides an intuitive interface for database management and query optimization."
        },
        {
            question: "How do I create a new project?",
            answer: "To create a new project, go to your dashboard and click on 'Create Project'. Enter your project details including name and description. DBuddy will automatically set up a database for your project."
        },
        {
            question: "Can I import my existing database?",
            answer: "Yes! DBuddy supports importing existing databases. Navigate to your project settings and use the 'Import Database' feature. You can import database schemas and data from various formats."
        },
        {
            question: "How does the AI query assistance work?",
            answer: "Our AI query assistant analyzes your natural language input and generates optimized SQL queries. Simply describe what you want to do in plain English, and the AI will generate the appropriate query for you. You can review and execute the query directly."
        },
        {
            question: "Is my data secure?",
            answer: "Absolutely! We use industry-standard encryption for data storage and transmission. All connections are secured with SSL/TLS, and your database credentials are encrypted. We never access your data without your explicit permission."
        },
        {
            question: "Can I export my database?",
            answer: "Yes, you can export your database in multiple formats including SQL dumps, CSV, and JSON. Go to your project page and click on the 'Export' option to download your data."
        },
        {
            question: "What databases are supported?",
            answer: "DBuddy currently supports PostgreSQL databases hosted on Neon. We're working on adding support for MySQL, MongoDB, and other popular database systems."
        },
        {
            question: "How do I optimize my queries?",
            answer: "Navigate to the 'Optimization' tab in your project. DBuddy will analyze your queries and suggest improvements for better performance. You can also view execution plans and query statistics."
        },
        {
            question: "Can I see my query history?",
            answer: "Yes! The 'Query History' section keeps track of all your executed queries. You can view, search, and re-execute previous queries. You can also mark queries as favorites for quick access."
        },
        {
            question: "How do I reset my password?",
            answer: "Click on 'Forgot Password' on the login page. Enter your email address, and we'll send you a one-time password (OTP) to reset your password. Follow the instructions in the email to set a new password."
        },
        {
            question: "What should I do if I encounter an error?",
            answer: "If you encounter an error, first check the error message for details. You can also visit the Support tab to raise a ticket with our support team. Include the error message and steps to reproduce the issue for faster assistance."
        },
        {
            question: "Can I collaborate with team members?",
            answer: "Currently, DBuddy is designed for individual use. Team collaboration features are planned for future releases. Stay tuned for updates!"
        },
        {
            question: "How do I delete a project?",
            answer: "To delete a project, go to your project page and click on the project settings. Look for the 'Delete Project' option. Note that this action is irreversible and will delete all associated data."
        },
        {
            question: "Is there a mobile app?",
            answer: "DBuddy is currently available as a web application optimized for desktop and tablet use. A dedicated mobile app is in our roadmap for future development."
        },
        {
            question: "How can I contact support?",
            answer: "You can contact support by raising a ticket in the Support tab. Our team will review your request and respond via email. For urgent issues, please mark your ticket as 'urgent' priority."
        }
    ];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="w-6 h-6 text-primary" />
                        Frequently Asked Questions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        {faqs.map((faq, index) => (
                            <FAQItem
                                key={index}
                                question={faq.question}
                                answer={faq.answer}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Video Tutorial Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Youtube className="w-6 h-6 text-red-500" />
                        Video Tutorial
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted">
                        <iframe
                            width="100%"
                            height="100%"
                            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                            title="DBuddy Tutorial"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                        ></iframe>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                        Watch this comprehensive tutorial to learn how to use DBuddy effectively.
                        Learn about creating projects, executing queries, optimizing performance, and more!
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default FAQsSection;