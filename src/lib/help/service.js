// Service layer for help & support operations
import { getTickets, addTicket } from './db.js';
import { randomUUID } from 'crypto';

// List all tickets
export async function listTickets() {
    return await getTickets();
}

// Create a new ticket
export async function createTicket(payload) {
    const { name, email, subject, description, attachment } = payload;

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
    
    // Add attachment if provided
    if (attachment) {
        ticket.attachment = {
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            data: attachment.data
        };
    }

    return await addTicket(ticket);
}

// List FAQs (static data)
export function listFaqs() {
    return [
        // Account Issues (kept from original)
        {
            id: '1',
            category: 'Account Issues',
            question: 'How do I reset my account password?',
            answer: 'Click on the "Forgot Password" link on the login page. Enter your registered email address and you will receive a password reset link. Follow the instructions in the email to set a new password. If you don\'t receive the email, check your spam folder or contact support.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '2',
            category: 'Account Issues',
            question: 'I can\'t log in to my account, what should I do?',
            answer: 'First, ensure you\'re using the correct email and password. Try resetting your password using the "Forgot Password" link. If the issue persists, your account might be locked or inactive. Contact support for assistance.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '3',
            category: 'Account Issues',
            question: 'How do I update my email address?',
            answer: 'Go to your Profile page by clicking on your profile icon in the header. Navigate to the account settings section where you can update your email address. You may need to verify the new email before the change takes effect.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '4',
            category: 'Account Issues',
            question: 'Why am I not receiving verification emails?',
            answer: 'Check your spam/junk folder first. Ensure the email address you provided is correct. If you still don\'t receive emails, there might be a server issue. Try requesting a new verification email or contact support.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '5',
            category: 'Account Issues',
            question: 'How can I delete my account permanently?',
            answer: 'Go to your Profile page and look for the account deletion option in settings. Note that deleting your account will permanently remove all your projects and data. This action cannot be undone.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '6',
            category: 'Account Issues',
            question: 'How do I change my profile information?',
            answer: 'Click on your profile icon in the header and navigate to the Profile page. Here you can update your name, role, and other profile information. Don\'t forget to save your changes.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '7',
            category: 'Account Issues',
            question: 'My account was locked. How do I unlock it?',
            answer: 'Account locks usually occur after multiple failed login attempts for security reasons. Wait 15-30 minutes and try again, or use the "Forgot Password" option to reset your password. If the issue persists, contact support.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '8',
            category: 'Account Issues',
            question: 'How can I enable two-factor authentication?',
            answer: 'Two-factor authentication is currently not available in DBuddy. This feature is planned for future updates to enhance account security.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '9',
            category: 'Account Issues',
            question: 'How do I recover my account if I forgot the email?',
            answer: 'Unfortunately, without access to your registered email, account recovery is very difficult. Try to remember any email addresses you might have used. If you cannot recall, contact support with any identifying information about your account.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '10',
            category: 'Account Issues',
            question: 'How do I switch user roles?',
            answer: 'Go to your Profile page and you\'ll find a role selector where you can choose between Student, Professional, or other available roles. Your role selection helps customize your DBuddy experience.',
            helpful: 0,
            notHelpful: 0,
        },

        // Added FAQs from uploaded file (project-related)
        {
            id: '11',
            category: 'Project Management',
            question: 'How do I create a new database project in DBuddy?',
            answer: 'From the Dashboard, click "Create New Project" (or "Import Database"). Choose whether to create an empty PostgreSQL project or import an existing database by entering host, port, DB name, username, and password. Save to finish setup.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '12',
            category: 'Project Management',
            question: 'How can I delete an existing project?',
            answer: 'Open the project, go to project settings or the options menu (three dots), select "Delete Project", and confirm. Deletion is permanent—export any needed data before removing a project.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '13',
            category: 'Project Management',
            question: 'Why can’t I see my newly created project on the dashboard?',
            answer: 'Try refreshing the page and ensure the creation process completed without errors. Check network connection and console logs for errors. If importing, confirm the import succeeded and that you used correct credentials.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '14',
            category: 'Project Management',
            question: 'How do I rename a project?',
            answer: 'Open the project, click the project options or settings, choose "Rename Project", enter the new name and save. The dashboard will update with the new name.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '15',
            category: 'Project Management',
            question: 'Can I import an existing database into DBuddy?',
            answer: 'Yes — use "Import Database" on the Dashboard and provide your PostgreSQL connection details. DBuddy will connect and import schema and data according to provided permissions.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '16',
            category: 'Project Management',
            question: 'How do I manage multiple projects efficiently?',
            answer: 'Use consistent naming conventions, the dashboard search, and browser bookmarks for frequently used projects. Organize by environment or client name to quickly switch contexts.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '17',
            category: 'Project Management',
            question: 'Is there a limit to how many projects I can create?',
            answer: 'There is no strict UI-enforced limit, but performance depends on your account plan and system resources. If you hit limits, consider archiving or removing unused projects.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '18',
            category: 'Project Management',
            question: 'How do I clone or duplicate a project?',
            answer: 'There is no one-click clone feature. Export the schema and data from the original project (via SQL dumps or exports), then create a new project and import those exports to replicate the project.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '19',
            category: 'Tables & Schema',
            question: 'How do I create new tables in my project?',
            answer: 'Open your project and go to the Table Explorer or Schema tab, click "Create Table", define columns/data types/constraints, then save. You can also run a CREATE TABLE SQL statement in the Query editor.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '20',
            category: 'Tables & Schema',
            question: 'Why is my table not showing in the sidebar?',
            answer: 'Refresh the project view and ensure the table was created successfully. Confirm your database connection is active and that you have permissions to view that schema. Check for sync or caching delays.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '21',
            category: 'Tables & Schema',
            question: 'How do I edit table schema (columns, constraints, etc.)?',
            answer: 'Select the table, open the Schema tab, choose "Edit Schema" to add, modify, or drop columns and constraints. For complex changes, consider running ALTER TABLE statements and backup data before altering production tables.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '22',
            category: 'Tables & Schema',
            question: 'Can I reorder columns inside a table?',
            answer: 'PostgreSQL does not support reordering columns directly. To change order you must create a new table with the desired column order, copy data into it, drop the old table, and rename the new one. Do this carefully with backups.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '23',
            category: 'Tables & Schema',
            question: 'How do I delete unwanted columns safely?',
            answer: 'Open the Schema editor, remove the column and confirm. Check for dependencies (views, triggers, foreign keys) first and backup data. You can also run ALTER TABLE ... DROP COLUMN after ensuring it won’t break your schema.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '24',
            category: 'Tables & Schema',
            question: 'Why am I unable to modify primary key columns?',
            answer: 'Primary key changes can affect relationships and indexed constraints. You typically must drop dependent foreign keys and indexes before modifying a primary key. Plan and backup before making such changes.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '25',
            category: 'Tables & Schema',
            question: 'How do I view relationships between tables?',
            answer: 'Use the Schema Visualization or ER Diagram feature in the project to see tables and foreign key links. This visual helps identify relationships and dependency chains quickly.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '26',
            category: 'Tables & Schema',
            question: 'How can I see all schema details for a project?',
            answer: 'Open the Schema tab for the project: it lists tables, columns, types, constraints, and keys. You can also query information_schema or use pg_catalog queries for a detailed programmatic view.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '27',
            category: 'Query',
            question: 'How do I run custom SQL queries inside DBuddy?',
            answer: 'Go to the Query tab for your project, type or paste your SQL, and click "Run Query" or press Ctrl+Enter. Results appear below the editor with options to export or page through results.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '28',
            category: 'Query',
            question: 'Why is my SQL query returning an error?',
            answer: 'Check syntax, table/column names, and that the user has permission to run the query. Review the error message shown by DBuddy for specifics and adjust your SQL accordingly.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '29',
            category: 'Query',
            question: 'How do I fetch more rows using Load More?',
            answer: 'When query results are truncated, click the "Load More" button at the bottom of the results to fetch additional rows. For very large result sets, use LIMIT/OFFSET or paginate results.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '30',
            category: 'Query',
            question: 'Can I save frequently used queries?',
            answer: 'Yes — use Query History or the save feature in the Query editor to store frequently used SQL. You can reopen, edit, and rerun saved queries later.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '31',
            category: 'Query',
            question: 'How do I restore a query from history into the editor?',
            answer: 'Open Query History, locate the past query, and click to load it into the editor. From there you can modify and re-run it.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '32',
            category: 'Query',
            question: 'Why is my query taking too long to run?',
            answer: 'Long queries often stem from missing indexes, large table scans, or complex joins. Use EXPLAIN to analyze query plans, add appropriate indexes, or limit result sets to improve performance.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '33',
            category: 'Query',
            question: 'Can I join multiple tables inside the query editor?',
            answer: 'Absolutely — write standard SQL JOIN clauses (INNER, LEFT, RIGHT, etc.) in the Query editor. DBuddy will execute them as long as the referenced tables and columns exist and you have access.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '34',
            category: 'Query',
            question: 'Why am I seeing incorrect results in my query?',
            answer: 'Verify JOIN conditions, WHERE clauses, and that you\'re referencing the correct columns and tables. Check for unexpected duplicates and ensure data types match comparisons.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '35',
            category: 'API & Auth',
            question: 'How do I generate an API token from the profile page?',
            answer: 'Go to Profile > API Tokens, click "Generate API Token". Save the token immediately — it is shown only once for security reasons.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '36',
            category: 'API & Auth',
            question: 'Why is my API token not showing after generation?',
            answer: 'Tokens are typically displayed only immediately after creation. If you close the dialog, you will need to generate a new token. Tokens are not retrievable for security.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '37',
            category: 'API & Auth',
            question: 'How do I copy and use the generated Bearer token?',
            answer: 'Click the "Copy" button next to the token, then include it in requests as the Authorization header: "Authorization: Bearer YOUR_TOKEN". Keep tokens secure and do not expose them publicly.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '38',
            category: 'API & Auth',
            question: 'Where do I use my API token for external requests?',
            answer: 'Include the token in the HTTP Authorization header when calling DBuddy API endpoints over HTTPS. Example: Authorization: Bearer <token>.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '39',
            category: 'API & Auth',
            question: 'Can I regenerate a new API token if lost?',
            answer: 'Yes — generate a new token from the Profile page. Note that generating a new one usually invalidates the previous token, so update any integrations using it.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '40',
            category: 'API & Auth',
            question: 'Why does my token expire after 7 days?',
            answer: 'Short token lifetimes are a security measure to reduce the risk of unauthorized access. Generate a fresh token when the old one expires and rotate tokens regularly.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '41',
            category: 'API & Auth',
            question: 'How do I authenticate API requests using the token?',
            answer: 'Add the Authorization header: "Authorization: Bearer YOUR_TOKEN" to your HTTP requests and use HTTPS to transmit tokens securely.',
            helpful: 0,
            notHelpful: 0,
        },
        {
            id: '52',
            category: 'API & Auth',
            question: 'Why am I getting unauthorized errors when using the token?',
            answer: 'Verify the token hasn\'t expired, that it was copied completely, and that you are using the correct Authorization header format. Generate a new token if these checks fail.',
            helpful: 0,
            notHelpful: 0,
        },
    ];
}