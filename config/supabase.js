const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Missing Supabase configuration. Image uploads will not work. Please set SUPABASE_URL and SUPABASE_API_KEY in .env');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
}

module.exports = supabase;
