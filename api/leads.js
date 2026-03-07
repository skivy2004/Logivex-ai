import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const crmService = require('../services/crm-service.js');
const logger = require('../utils/logger.js');
const { methodNotAllowed, getQuery } = require('../lib/serverless-utils.js');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  try {
    const query = getQuery(req);
    const limit = Math.min(parseInt(query.limit, 10) || 20, 50);
    const leads = await crmService.getRecentLeads(limit);
    return res.status(200).json({ success: true, data: leads });
  } catch (err) {
    logger.error('Leads route error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Error fetching leads.' });
  }
}
