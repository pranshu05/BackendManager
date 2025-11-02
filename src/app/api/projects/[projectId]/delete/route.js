import { NextResponse } from 'next/server';
import {executeQuery, getDatabaseSchema } from '@/lib/db';
import { withProjectAuth } from '@/lib/api-helpers';

//Delete records

export const POST=withProjectAuth(async (request,_context,user,project)=> {
     try {
        const body=await request.json();
        const {table,pkcols,pkvalues } = body;
          if (!project || !project.connection_string) {
            return NextResponse.json({ error: 'Project information is missing' }, { status: 400 });
        }

        if (!table || !pkcols || !pkvalues) {
            return NextResponse.json(
                { error: 'Missing required fields: projectId, table, pkcols, pkvalues' },
                { status: 400 }
            );
        }

   const connectionString = project.connection_string;

if (!Array.isArray(pkvalues) || pkvalues.length === 0 || typeof pkvalues[0] !== 'object' || Array.isArray(pkvalues[0]))
     {
        return NextResponse.json({ error: 'pkvalues must be a non-empty array of objects' }, { status: 400 });
     }

        if (!Array.isArray(pkcols) || pkcols.length === 0)
        {
            return NextResponse.json({ error: 'pkcols required when sending pkvalues as objects' }, { status: 400 });
        }

        let schema;
        try 
        {
            schema = await getDatabaseSchema(connectionString);
        } catch (e) {
            console.error('Failed to load schema for delete operation:', e);
            return NextResponse.json({ error: 'Failed to load project database schema' }, { status: 500 });
        }

        const tableMeta = schema.find(t => t.name === table);
        if (!tableMeta) {
            return NextResponse.json({ error: 'Table not found in project database' }, { status: 400 });
        }

        // Building column list and a map of column -> data type 
        const colsList = pkcols.map(c => `"${c}"`).join(', ');
        const colTypeMap = {};
        for (const colName of pkcols) {
            const cm = tableMeta.columns.find(x => x.name === colName);
            if (!cm) {
                return NextResponse.json({ error: `Primary key column not found in table: ${colName}` }, { status: 400 });
            }
            colTypeMap[colName] = (cm.type || cm.data_type || 'text').toString().toLowerCase();
        }
        const valuesTuples = [];
        const params = [];
        let paramIndex = 1;

        // Helper to map information_schema type to a safe cast type
        const mapTypeToCast = (dt) => {
            if (!dt) return '';
            if (dt.includes('uuid')) return '::uuid';
            if (dt.includes('int')) return '::integer';
            if (dt.includes('bigint')) return '::bigint';
            if (dt.includes('numeric') || dt.includes('decimal') || dt.includes('real') || dt.includes('double')) return '::numeric';
            if (dt.includes('boolean')) return '::boolean';
            if (dt.includes('jsonb')) return '::jsonb';
            if (dt.includes('json')) return '::json';
            if (dt.includes('timestamp') || dt.includes('date') || dt.includes('time')) return '::timestamp';
            // default to text
            return '::text';
        };

        for (const rowObj of pkvalues) 
        {
            const valuesForRow = pkcols.map(c => rowObj[c]);
            if (valuesForRow.some(v => typeof v === 'undefined')) {
                return NextResponse.json({ error: 'Missing pk value for one of the rows' }, { status: 400 });
            }
            const placeholders = valuesForRow.map((_, i) => {
                const colName = pkcols[i];
                const cast = mapTypeToCast(colTypeMap[colName]);
                return `$${paramIndex + i}${cast}`;
            });
            valuesTuples.push(`(${placeholders.join(', ')})`);
            params.push(...valuesForRow);
            paramIndex += valuesForRow.length;
        }

        const deletequery = `DELETE FROM "${table}" WHERE (${colsList}) IN (VALUES ${valuesTuples.join(', ')})`;

        console.log('Delete Query:', deletequery);
        console.log('Params for deletion:', params);

        await executeQuery(connectionString, deletequery, params);

        return NextResponse.json({ success: true, message: `record(s) deleted successfully` }, { status: 200 });
     
    } catch (error) {
        console.error('Error deleting records:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
});


