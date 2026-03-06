/**
 * Supabase client for server-side use (Node.js only).
 * Uses SUPABASE_SERVICE_ROLE_KEY for admin operations and user lookup.
 * Never expose this key to the frontend.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

module.exports = {
  getSupabaseAdmin
};
