// API route to get vote counts and user votes
import { NextResponse } from 'next/server';
import { getVotes } from '@/lib/help/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
    try {
        // Authenticate user
        const authResult = await requireAuth(request);
        if (authResult.error) {
            return NextResponse.json(
                { ok: false, error: authResult.error },
                { status: authResult.status }
            );
        }

        const { user } = authResult;
        const votes = await getVotes();

        // Calculate counts for each question
        const voteCounts = {};
        const userVotes = {};

        votes.forEach(vote => {
            // Initialize counts if not exists
            if (!voteCounts[vote.questionId]) {
                voteCounts[vote.questionId] = { helpful: 0, notHelpful: 0 };
            }

            // Count votes
            if (vote.isHelpful) {
                voteCounts[vote.questionId].helpful++;
            } else {
                voteCounts[vote.questionId].notHelpful++;
            }

            // Track current user's votes
            if (vote.userId === user.id) {
                userVotes[vote.questionId] = vote.isHelpful;
            }
        });

        return NextResponse.json({
            ok: true,
            voteCounts,
            userVotes
        });
    } catch (error) {
        console.error('Error fetching votes:', error);
        return NextResponse.json(
            { ok: false, error: error.message || 'Failed to fetch votes' },
            { status: 500 }
        );
    }
}