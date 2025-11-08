import { NextResponse } from 'next/server';
import { withProjectAuth } from '@/lib/api-helpers';
import { generatequerysuggestions } from '@/lib/ai';
import { getDatabaseSchema } from '@/lib/db';

export const GET = withProjectAuth(async (request, _context, user, project) => {
   const connectionString = project.connection_string;
          try {
              const schema = await getDatabaseSchema(connectionString);
              const suggestions = await generatequerysuggestions(schema);
              return NextResponse.json({suggestions});
          }
          catch(err){
    console.error("Error generating suggestions:", err);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
});