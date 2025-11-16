// Simple JSON-based database for storing support tickets
import { promises as fs } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'src', 'lib', 'help');
const TICKETS_FILE = join(DATA_DIR, 'tickets.json');

// Ensure directory and file exist
export async function init() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        try {
            await fs.access(TICKETS_FILE);
        } catch {
            // File doesn't exist, create it with empty array
            await fs.writeFile(TICKETS_FILE, JSON.stringify([], null, 2), 'utf-8');
        }
    } catch (error) {
        console.error('Error initializing tickets database:', error);
        throw error;
    }
}

// Get all tickets
export async function getTickets() {
    try {
        await init();
        const data = await fs.readFile(TICKETS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading tickets:', error);
        return [];
    }
}

// Add a new ticket
export async function addTicket(ticket) {
    try {
        await init();
        const tickets = await getTickets();
        tickets.push(ticket);
        await saveTickets(tickets);
        return ticket;
    } catch (error) {
        console.error('Error adding ticket:', error);
        throw error;
    }
}

// Save tickets array to file (atomic write)
export async function saveTickets(tickets) {
    try {
        await init();
        const tempFile = TICKETS_FILE + '.tmp';
        await fs.writeFile(tempFile, JSON.stringify(tickets, null, 2), 'utf-8');
        await fs.rename(tempFile, TICKETS_FILE);
    } catch (error) {
        console.error('Error saving tickets:', error);
        throw error;
    }
}