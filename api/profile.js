import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getSupabaseAdmin } = require('../lib/supabaseClient.js');
const { requireAuthContext } = require('../lib/serverless-auth.js');
const logger = require('../utils/logger.js');
const { methodNotAllowed, readRequestBody } = require('../lib/serverless-utils.js');

export default async function handler(req, res) {
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
  const { error } = await supabase.from('users').upsert(
    { id, name, email, role: 'user' },
    { onConflict: 'id' }
  );

  if (error) {
    logger.error('Profile upsert error', { error: error.message });
    return res.status(500).json({ success: false, message: 'Failed to save profile.' });
  }

  return res.status(200).json({ success: true });
}
