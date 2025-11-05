import { NextResponse } from 'next/server';
import { withProjectAuth } from '@/lib/api-helpers';
import { generatequerysuggestions } from '@/lib/ai';


export const GET = withProjectAuth(async (request, _context, user, project) => {

  try{
    console.log("get request received for query suggestions");
    const suggestions = await generatequerysuggestions(project);
    return NextResponse.json({ suggestions });
  }
  catch(err){
    console.error("Error generating suggestions:", err);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
});