// API route to get FAQ list
import { NextResponse } from 'next/server';
import { listFaqs } from '@/lib/help/service';

export async function GET() {
    try {
        const faqs = listFaqs();
        return NextResponse.json({ ok: true, faqs });
    } catch (error) {
        console.error('Error fetching FAQs:', error);
        return NextResponse.json(
            { ok: false, error: 'Failed to fetch FAQs' },
            { status: 500 }
        );
    }
}