const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSchema() {
  // We can't directly check schema easily via JS client without RPC, 
  // but we can try to select 'standard' and see if it fails.
  const { data, error } = await supabase.from('subjects').select('name, standard').limit(1);
  if (error) {
    if (error.message.includes('column "standard" does not exist')) {
        console.log('COLUMN_MISSING');
    } else {
        console.error(error);
    }
  } else {
    console.log('COLUMN_EXISTS');
  }
}

checkSchema();
