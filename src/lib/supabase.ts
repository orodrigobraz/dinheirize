import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bshukpufilndkbahuscf.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzaHVrcHVmaWxuZGtiYWh1c2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MTExNTgsImV4cCI6MjA5MTA4NzE1OH0.1LETe2P91N71Lj2UKTSFji_XS6fsLe_jXo3RboaW7_4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
