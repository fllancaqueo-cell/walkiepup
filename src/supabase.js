import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pigxfrgtedugegsxmqkf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZ3hmcmd0ZWR1Z2Vnc3htcWtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTcxOTYsImV4cCI6MjA5MDczMzE5Nn0.qSdwX2LBh61fLllBeGj7HRHsMRsCvicrM_ytVObzpAU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
