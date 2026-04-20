import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zptxmsmndmsrjrqgskxt.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdHhtc21uZG1zcmpycWdza3h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzOTUzMjksImV4cCI6MjA2MDAzMTMyOX0.976H7z_tY-uR-C-H3u6z4u6z4u6z4u6z4u6z4u6z4u6'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
