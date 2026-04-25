const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const config = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim())));

const supabase = createClient(config.VITE_SUPABASE_URL, config.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('students').select('id, name').limit(10);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample Students:', data);
  }
}

check();
