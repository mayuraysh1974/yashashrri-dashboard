const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

async function checkTests() {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .contains('subjects', ['XII Maths with entrance'])
    .gte('date', '2026-04-01')
    .lte('date', '2026-04-30');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Tests found:', data.length);
  console.log(JSON.stringify(data, null, 2));
}

checkTests();
