const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://zptxmsmndmsrjrqgskxt.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdHhtc21uZG1zcmpycWdza3h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzOTUzMjksImV4cCI6MjA2MDAzMTMyOX0.976H7z_tY-uR-C-H3u6z4u6z4u6z4u6z4u6z4u6z4u6');

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
