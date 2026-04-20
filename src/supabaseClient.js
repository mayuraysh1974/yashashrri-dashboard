import { createClient } from '@supabase/supabase-js'

// Clean hardcoded values to prevent build-time quoting issues
const supabaseUrl = 'https://zptxmsmndmsrjrqgskxt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwdHhtc21uZG1zcmpycWdza3h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzOTUzMjksImV4cCI6MjA2MDAzMTMyOX0.976H7z_tY-uR-C-H3u6z4u6z4u6z4u6z4u6z4u6z4u6'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
