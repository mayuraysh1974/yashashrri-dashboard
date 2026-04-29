const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSubjects() {
  const { data, error } = await supabase.from('subjects').select('name');
  if (error) console.error(error);
  else console.log(data.map(d => d.name));
}

checkSubjects();
