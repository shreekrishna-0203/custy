import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dgvlgzurgszrnsliwqnv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndmxnenVyZ3N6cm5zbGl3cW52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NDE1NjQsImV4cCI6MjA2MjIxNzU2NH0.QNvfTACF_QX7_qxZ1sKojAQXbBD5-n0VG4t9W-HyGac';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
