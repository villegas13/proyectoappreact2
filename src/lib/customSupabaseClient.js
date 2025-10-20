import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mscefsstpxxzdobxoors.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zY2Vmc3N0cHh4emRvYnhvb3JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTY1ODMsImV4cCI6MjA3MTEzMjU4M30.ZiEuBwiPmojGqJ7bbCG5yJ-BMI76xbe7HZ4_uZ-HuJ4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);