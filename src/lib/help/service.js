// Service layer for help & support operations
import { getTickets, addTicket } from './db.js';
import { randomUUID } from 'crypto';

// List all tickets
export async function listTickets() {
    return await getTickets();
}

// Create a new ticket
export async function createTicket(payload) {
    const { name, email, subject, description } = payload;

    // Validation
    if (!name || !name.trim()) {
        throw new Error('Name is required');
    }
    if (!email || !email.trim()) {
        throw new Error('Email is required');
    }
    if (!subject || !subject.trim()) {
        throw new Error('Subject is required');
    }
    if (!description || !description.trim()) {
        throw new Error('Description is required');
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        throw new Error('Invalid email format');
    }

    const ticket = {
        id: randomUUID(),
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        description: description.trim(),
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    return await addTicket(ticket);
}

// List FAQs (static data)
export function listFaqs() {
    return [
        {
            id: '1',
            category: 'Account Issues',
            question: 'How to connect my database?',
            answer: 'To connect your database, go to the Dashboard and click on "Import Database" or "Create New Project". Select your database type (MySQL, PostgreSQL, etc.) and enter your connection credentials. Make sure your database is accessible from the network.',
            helpful: 12,
            notHelpful: 2,
        },
        {
            id: '2',
            category: 'Technical',
            question: 'How to export data?',
            answer: 'You can export data by navigating to the Table Explorer, selecting the table you want to export, and clicking the "Export" button. Choose your preferred format (CSV, JSON, or Excel) and the export will be downloaded.',
            helpful: 8,
            notHelpful: 1,
        },
        {
            id: '3',
            category: 'Technical',
            question: 'How do I optimize queries?',
            answer: 'Use the Optimization tab in your project dashboard. The system will analyze your queries and provide suggestions for improving performance. You can also view query execution plans and indexes.',
            helpful: 15,
            notHelpful: 0,
        },
        {
            id: '4',
            category: 'Account Issues',
            question: 'How to reset my password?',
            answer: 'Click on the "Forgot Password" link on the login page. Enter your email address and you will receive a password reset link. Follow the instructions in the email to set a new password.',
            helpful: 20,
            notHelpful: 3,
        },
        {
            id: '5',
            category: 'Billing',
            question: 'Can I share queries with my team?',
            answer: 'Yes! You can share queries with your team members. Go to the Query History section, select the query you want to share, and use the share option. Team members with access to the project will be able to view and use the shared queries.',
            helpful: 10,
            notHelpful: 1,
        },
        {
            id: '6',
            category: 'Account Issues',
            question: 'How do I update my profile?',
            answer: 'Click on your profile icon in the header, then navigate to the Profile section. You can update your name, email, and other account information from there.',
            helpful: 7,
            notHelpful: 0,
        },
        {
            id: '7',
            category: 'Technical',
            question: 'What database types are supported?',
            answer: 'DBuddy currently supports MySQL, PostgreSQL, and SQLite databases. More database types will be added in future updates.',
            helpful: 14,
            notHelpful: 2,
        },
        {
            id: '8',
            category: 'Billing',
            question: 'How does billing work?',
            answer: 'DBuddy offers both free and paid plans. Free plans have limited features. Paid plans offer advanced features, more storage, and priority support. Check the pricing page for details.',
            helpful: 9,
            notHelpful: 1,
        },
    ];
}