
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugData() {
    console.log('Searching for Aarya Maydeo...');
    const { data: students, error: sErr } = await supabase
        .from('students')
        .select('*')
        .ilike('name', '%Aarya Maydeo%');
    
    if (sErr) return console.error('Student search error:', sErr);
    if (!students || students.length === 0) return console.log('Student not found.');

    const student = students[0];
    console.log('Found student:', student.name, 'ID:', student.id);

    console.log('Fetching results for ID:', student.id);
    const { data: results, error: rErr } = await supabase
        .from('test_results')
        .select('*, tests(*)')
        .eq('student_id', student.id);

    if (rErr) return console.error('Results fetch error:', rErr);
    console.log('Results found:', results.length);
    if (results.length > 0) {
        results.forEach(r => {
            console.log(`- Test: ${r.tests?.name}, Score: ${r.score}`);
        });
    }
}

debugData();
