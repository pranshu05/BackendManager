// Simple JSON-based database for storing support tickets
import { promises as fs } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'src', 'lib', 'help');
const TICKETS_FILE = join(DATA_DIR, 'tickets.json');
const VOTES_FILE = join(DATA_DIR, 'votes.json');

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
        try {
            await fs.access(VOTES_FILE);
        } catch {
            // File doesn't exist, create it with empty array
            await fs.writeFile(VOTES_FILE, JSON.stringify([], null, 2), 'utf-8');
        }
    } catch (error) {
        console.error('Error initializing help database:', error);
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

// Get all votes
export async function getVotes() {
    try {
        await init();
        const data = await fs.readFile(VOTES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading votes:', error);
        return [];
    }
}

// Save votes array to file (atomic write)
export async function saveVotes(votes) {
    try {
        await init();
        const tempFile = VOTES_FILE + '.tmp';
        await fs.writeFile(tempFile, JSON.stringify(votes, null, 2), 'utf-8');
        await fs.rename(tempFile, VOTES_FILE);
    } catch (error) {
        console.error('Error saving votes:', error);
        throw error;
    }
}

// Add or update a vote
export async function addOrUpdateVote(vote) {
    try {
        const votes = await getVotes();
        
        // Check if user already voted on this question
        const existingVoteIndex = votes.findIndex(
            v => v.userId === vote.userId && v.questionId === vote.questionId
        );
        
        if (existingVoteIndex !== -1) {
            // Update existing vote
            votes[existingVoteIndex] = vote;
        } else {
            // Add new vote
            votes.push(vote);
        }
        
        await saveVotes(votes);
        return vote;
    } catch (error) {
        console.error('Error adding/updating vote:', error);
        throw error;
    }
}

// Get vote counts for a question
export async function getVoteCounts(questionId) {
    try {
        const votes = await getVotes();
        const questionVotes = votes.filter(v => v.questionId === questionId);
        
        const helpful = questionVotes.filter(v => v.isHelpful).length;
        const notHelpful = questionVotes.filter(v => !v.isHelpful).length;
        
        return { helpful, notHelpful };
    } catch (error) {
        console.error('Error getting vote counts:', error);
        return { helpful: 0, notHelpful: 0 };
    }
}

// Get user's vote for a question
export async function getUserVote(userId, questionId) {
    try {
        const votes = await getVotes();
        return votes.find(v => v.userId === userId && v.questionId === questionId) || null;
    } catch (error) {
        console.error('Error getting user vote:', error);
        return null;
    }
}