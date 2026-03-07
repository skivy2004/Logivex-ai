const { getSupabaseAdmin } = require('../lib/supabaseClient.js');
const { requireAuthContext } = require('../lib/serverless-auth.js');
const logger = require('../utils/logger.js');
const { methodNotAllowed, readRequestBody } = require('../lib/serverless-utils.js');

module.exports = async function handler(req, res) {
  try {
    const host = req?.headers?.host || 'localhost';
    const url = new URL(req?.url || '/', `http://${host}`);
    const action = url.searchParams.get('action');
    const pathname = url.pathname.replace(/\/+$/, '');

    if (action === 'me' || pathname.endsWith('/me')) {
      return handleMe(req, res);
    }

    if (action === 'profile' || pathname.endsWith('/profile')) {
      return handleProfile(req, res);
    }

    return res.status(400).json({ success: false, message: 'Invalid account action.' });
  } catch (err) {
    console.error('account.js error:', err);
    logger.error('Account handler error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

async function handleMe(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const auth = await requireAuthContext(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  return res.status(200).json({
    success: true,
    user: {
      id: auth.userProfile.id,
      email: auth.userProfile.email,
      name: auth.userProfile.name,
      role: auth.userProfile.role || 'user'
    }
  });
}

async function handleProfile(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  const auth = await requireAuthContext(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const body = await readRequestBody(req);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({ success: false, message: 'Auth not configured.' });
  }

  const { id } = auth.authUser;
  const email = auth.authUser.email || '';
  const role = auth.userProfile && auth.userProfile.role ? auth.userProfile.role : 'user';
  const { error } = await supabase.from('users').upsert(
    { id, name, email, role },
    { onConflict: 'id' }
  );

  if (error) {
    logger.error('Profile upsert error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to save profile.' });
  }

  return res.status(200).json({ success: true });
}
