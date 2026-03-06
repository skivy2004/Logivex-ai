/**
 * Supabase JWT verification and role lookup.
 * Use requireAuth for any authenticated route, requireAdmin for admin-only.
 */

const { getSupabaseAdmin } = require('./supabaseClient');
const logger = require('../utils/logger');

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({ success: false, message: 'Auth not configured.' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', user.id)
      .single();

    req.authUser = user;
    req.userProfile = profile || { id: user.id, email: user.email, name: user.user_metadata?.name || null, role: 'user' };
    next();
  } catch (err) {
    logger.error('Auth middleware error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Authentication failed.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.userProfile || req.userProfile.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
