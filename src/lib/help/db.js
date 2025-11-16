import { pool } from '@/lib/db';

// Initialize tickets table if it doesn't exist
export async function ensureTicketsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS support_tickets (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                project VARCHAR(255) NOT NULL,
                error_type VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                attachment_path VARCHAR(500),
                status VARCHAR(50) DEFAULT 'Pending',
                priority VARCHAR(50) DEFAULT 'Low',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (error) {
        console.error('Error ensuring tickets table exists:', error);
        throw error;
    }
}

// Create a new ticket
export async function createTicket(ticketData) {
    await ensureTicketsTable();
    
    const { name, email, project, errorType, description, attachmentPath, status = 'Pending', priority = 'Low' } = ticketData;
    
    const result = await pool.query(
        `INSERT INTO support_tickets (name, email, project, error_type, description, attachment_path, status, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [name, email, project, errorType, description, attachmentPath || null, status, priority]
    );
    
    return result.rows[0];
}

// Get all tickets
export async function getAllTickets(searchQuery = '') {
    await ensureTicketsTable();
    
    let query = 'SELECT * FROM support_tickets ORDER BY created_at DESC';
    let params = [];
    
    if (searchQuery) {
        query = `SELECT * FROM support_tickets 
                 WHERE LOWER(description) LIKE $1 
                 OR LOWER(name) LIKE $1 
                 OR LOWER(email) LIKE $1 
                 OR CAST(id AS TEXT) LIKE $1
                 ORDER BY created_at DESC`;
        params = [`%${searchQuery.toLowerCase()}%`];
    }
    
    const result = await pool.query(query, params);
    return result.rows;
}

// Get ticket by ID
export async function getTicketById(id) {
    await ensureTicketsTable();
    
    const result = await pool.query('SELECT * FROM support_tickets WHERE id = $1', [id]);
    return result.rows[0];
}

// Update ticket
export async function updateTicket(id, updates) {
    await ensureTicketsTable();
    
    const { status, priority } = updates;
    const updatesArray = [];
    const params = [];
    let paramIndex = 1;
    
    if (status !== undefined) {
        updatesArray.push(`status = $${paramIndex++}`);
        params.push(status);
    }
    
    if (priority !== undefined) {
        updatesArray.push(`priority = $${paramIndex++}`);
        params.push(priority);
    }
    
    if (updatesArray.length === 0) {
        return await getTicketById(id);
    }
    
    params.push(id);
    const query = `UPDATE support_tickets SET ${updatesArray.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await pool.query(query, params);
    return result.rows[0];
}

// Get ticket statistics
export async function getTicketStats() {
    await ensureTicketsTable();
    
    const result = await pool.query(`
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'Resolved') as resolved,
            COUNT(*) FILTER (WHERE status != 'Resolved') as active,
            COUNT(*) FILTER (WHERE status = 'Open') as open,
            COUNT(*) FILTER (WHERE status = 'Pending') as pending
        FROM support_tickets
    `);
    
    return result.rows[0];
}

