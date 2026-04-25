const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://zptxmsmndmsrjrqgskxt.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdHhtc21uZG1zcmpycWdza3h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzOTUzMjksImV4cCI6MjA2MDAzMTMyOX0.976H7z_tY-uR-C-H3u6z4u6z4u6z4u6z4u6z4u6z4u6');

async function checkTables() {
  const tr = await supabase.from('test_results').select('id', { count: 'exact', head: true });
  const sp = await supabase.from('student_performance').select('id', { count: 'exact', head: true });
  
  console.log('test_results count:', tr.count);
  console.log('student_performance count:', sp.count);
}

checkTables();
