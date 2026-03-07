const demos = require('../data/demo-config.js');
const { getSupabaseAdmin } = require('../lib/supabaseClient.js');
const { requireAdminContext } = require('../lib/serverless-auth.js');
const logger = require('../utils/logger.js');
const { methodNotAllowed, readRequestBody, getQuery } = require('../lib/serverless-utils.js');

module.exports = async function handler(req, res) {
  const auth = await requireAdminContext(req);
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  if (req.method === 'GET') {
    return handleList(req, res);
  }

  if (req.method === 'PATCH') {
    return handlePatch(req, res);
  }

  return methodNotAllowed(res, ['GET', 'PATCH']);
};

async function handleList(req, res) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ success: false, message: 'Supabase not configured.' });
    }

    const { data, error } = await supabase
      .from('features')
      .select('id, name, status, updated_at')
      .order('id');

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const byId = (data || []).reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {});

    const merged = demos.map((demo) => ({
      id: demo.id,
      name: demo.name,
      status: byId[demo.id]?.status != null ? byId[demo.id].status : demo.status,
      updated_at: byId[demo.id]?.updated_at || null
    }));

    return res.status(200).json({ success: true, data: merged });
  } catch (err) {
    logger.error('Features list error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

async function handlePatch(req, res) {
  try {
    const query = getQuery(req);
    const id = query.id && String(query.id).trim();
    if (!id) {
      return res.status(400).json({ success: false, message: 'Feature id required.' });
    }

    const body = await readRequestBody(req);
    const status = body?.status;
    const allowed = ['beta', 'online', 'coming_soon'];
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid status. Use: beta, online, coming_soon' });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return res.status(503).json({ success: false, message: 'Supabase not configured.' });
    }

    const demo = demos.find((item) => item.id === id);
    const name = demo ? demo.name : id;
    const { error } = await supabase.from('features').upsert(
      { id, name, status, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

    if (error) {
      logger.error('Feature update error', { error: error.message });
      return res.status(500).json({ success: false, message: error.message });
    }

    return res.status(200).json({ success: true, data: { id, name, status } });
  } catch (err) {
    logger.error('Feature patch error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}
