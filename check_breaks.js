const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBreaks() {
  try {
    const { data: breaks, error } = await supabase
      .from('work_breaks')
      .select('*')
      .eq('ticket_id', 'ST-005');
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Breaks for ST-005:', JSON.stringify(breaks, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

checkBreaks();
