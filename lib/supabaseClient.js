/**
 * Supabase client for server-side use (Node.js only).
 * Uses SUPABASE_SERVICE_ROLE_KEY for admin operations and user lookup.
 * Never expose this key to the frontend.
 */

const logger = require('../utils/logger');

function getSupabaseAdminStatus() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    return {
      ok: false,
      reason: `Missing required env vars: ${missing.join(', ')}`
    };
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    return {
      ok: true,
      createClient,
      supabaseUrl,
      supabaseServiceKey
    };
  } catch (err) {
    logger.error('Supabase SDK load failed', { error: err.message });
    return {
      ok: false,
      reason: 'Failed to load @supabase/supabase-js'
    };
  }
}

function getSupabaseAdmin() {
  const status = getSupabaseAdminStatus();
  if (!status.ok) {
    logger.warn('Supabase admin unavailable', { reason: status.reason });
    return null;
  }

  return status.createClient(status.supabaseUrl, status.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

module.exports = {
  getSupabaseAdmin,
  getSupabaseAdminStatus
};
