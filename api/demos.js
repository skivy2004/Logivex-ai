import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const demos = require('../data/demo-config.js');
const { getConfig } = require('../config/env.js');
const { getSupabaseAdmin } = require('../lib/supabaseClient.js');
const logger = require('../utils/logger.js');
const { methodNotAllowed, getQuery, getRequestHost } = require('../lib/serverless-utils.js');

async function getLocalDemos() {
  try {
    const supabase = getSupabaseAdmin();
    const statusMap = {};

    if (supabase) {
      const { data: rows } = await supabase.from('features').select('id, status');
      if (Array.isArray(rows)) {
        rows.forEach((row) => {
          statusMap[row.id] = row.status;
        });
      }
    }

    return demos.map((demo) => ({
      ...demo,
      status: statusMap[demo.id] != null ? statusMap[demo.id] : demo.status
    }));
  } catch (err) {
    logger.error('Demos local fetch error', { error: err.message });
    return demos;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const config = getConfig();
  const demosApiUrl = config.demosApiUrl;
  const query = getQuery(req);
  const requestHost = getRequestHost(req);
  let apiHost = '';

  try {
    apiHost = demosApiUrl ? new URL(demosApiUrl).hostname : '';
  } catch (_) {
    apiHost = '';
  }

  const isSameOrigin = apiHost && requestHost && apiHost === requestHost;

  if (query.source === 'local' || !demosApiUrl || isSameOrigin) {
    return res.status(200).json({ demos: await getLocalDemos() });
  }

  try {
    const url = demosApiUrl.includes('?') ? `${demosApiUrl}&source=local` : `${demosApiUrl}?source=local`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Demos API returned ${response.status}`);
    }

    const data = await response.json();
    const list = Array.isArray(data) ? data : Array.isArray(data.demos) ? data.demos : [];
    return res.status(200).json({ demos: list });
  } catch (err) {
    logger.error('Demos API fetch error', { error: err.message });
    return res.status(200).json({ demos: await getLocalDemos() });
  }
}