const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_API_KEY in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
