import { NextResponse } from 'next/server';
import { withProjectAuth } from '@/lib/api-helpers';
import { getDatabaseSchema } from '@/lib/db';
import { schemaToUML } from '@/lib/ai';

export const GET=withProjectAuth(async (request, _context, user, project) => {
    try {
        if (!project || !project.connection_string) {
            return NextResponse.json({ error: 'Project information is missing' }, { status: 400 });
        }
        const connectionString = project.connection_string;

        let uml;  
        try {
            const schema = await getDatabaseSchema(connectionString);
           
            uml = await schemaToUML(schema);
            console.log('Generated the UML code');

           return NextResponse.json({ plantuml: uml }, { status: 200 });
        } catch (e) {
            console.error('Failed to load schema for project DB:', e);
            return NextResponse.json({ error: 'Failed to load project database schema' }, { status: 500 });
        }
    } catch (e) {
        console.error('Error in GET /diagram:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
});
        // Create diagram