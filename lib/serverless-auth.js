const { getSupabaseAdmin } = require('./supabaseClient');
const logger = require('../utils/logger');

async function requireAuthContext(req) {
  const headers = req && req.headers && typeof req.headers === 'object' ? req.headers : {};
  const authHeader = headers.authorization || headers.Authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return {
      ok: false,
      status: 401,
      body: { success: false, message: 'Authentication required.' }
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      ok: false,
      status: 503,
      body: { success: false, message: 'Auth not configured.' }
    };
  }

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        ok: false,
        status: 401,
        body: { success: false, message: 'Invalid or expired token.' }
      };
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', user.id)
      .single();

    return {
      ok: true,
      authUser: user,
      userProfile:
        profile || {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || null,
          role: 'user'
        }
    };
  } catch (err) {
    logger.error('Auth helper error', { error: err.message });
    return {
      ok: false,
      status: 500,
      body: { success: false, message: 'Authentication failed.' }
    };
  }
}

async function requireAdminContext(req) {
  const auth = await requireAuthContext(req);
  if (!auth.ok) return auth;

  if (!auth.userProfile || auth.userProfile.role !== 'admin') {
    return {
      ok: false,
      status: 403,
      body: { success: false, message: 'Admin access required.' }
    };
  }

  return auth;
}

module.exports = {
  requireAuthContext,
  requireAdminContext
};
