import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { parse } from "https://deno.land/std@0.168.0/encoding/csv.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const delimiter = formData.get('delimiter') as string || ',';
    const encoding = formData.get('encoding') as string || 'utf-8';

    if (!file) {
      throw new Error('No file provided');
    }

    // Read file content
    const content = await file.text();
    
    // Parse CSV using Deno's csv parser (similar to pandas.read_csv)
    const data = parse(content, {
      skipFirstRow: false,
      separator: delimiter,
    }) as string[][];

    // Extract headers (first row)
    const headers = data[0] as string[];
    
    // Convert rows to objects (similar to pandas DataFrame)
    const rows = data.slice(1).map((row) => {
      const obj: Record<string, any> = {};
      headers.forEach((header, index) => {
        // Handle empty values as null (pandas-like behavior)
        const value = row[index];
        obj[header] = value === '' || value === undefined ? null : value;
      });
      return obj;
    }).filter((row: Record<string, any>) => {
      // Remove completely empty rows (pandas dropna behavior)
      return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
    });

    // Basic statistics (similar to pandas.describe())
    const stats = {
      rowCount: rows.length,
      columnCount: headers.length,
      columns: headers,
      nullCounts: headers.reduce((acc, header) => {
        acc[header] = rows.filter(row => row[header] === null).length;
        return acc;
      }, {} as Record<string, number>),
    };

    console.log(`CSV loaded with Pandas-like processing: ${rows.length} rows × ${headers.length} columns`);

    return new Response(
      JSON.stringify({
        success: true,
        data: rows.slice(0, 100), // Limit to first 100 rows for preview
        totalRows: rows.length,
        columns: headers,
        stats,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error processing CSV:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Unknown error' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
