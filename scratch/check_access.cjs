const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const config = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim())));

const supabase = createClient(config.VITE_SUPABASE_URL, config.VITE_SUPABASE_ANON_KEY);

async function check() {
  const studentName = 'Vaishnavi Gavali';
  
  // 1. Find student
  const { data: student } = await supabase.from('students').select('*').ilike('name', `%${studentName}%`).single();
  console.log('Student:', student?.name, 'ID:', student?.id);

  // 2. Check student_subjects
  const { data: subStats } = await supabase
    .from('student_subjects')
    .select('*, subjects(name)')
    .eq('student_id', student?.id);
  console.log('Student Subjects:', JSON.stringify(subStats, null, 2));

  // 3. Check the test on 25 Apr
  const { data: tests } = await supabase
    .from('tests')
    .select('*')
    .eq('date', '2026-04-25');
  console.log('Tests on 25 Apr:', JSON.stringify(tests, null, 2));
}

check();
