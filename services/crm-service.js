/**
 * In-memory CRM store for demo: recent leads.
 * Not persisted across server restarts.
 */

const logger = require('../utils/logger');

const MAX_RECENT_LEADS = 50;
const recentLeads = [];

/**
 * Add a lead to the demo CRM (in memory).
 * @param {object} lead - Lead object with name, company, lead_classification, etc.
 * @returns {object} Stored lead with id and createdAt
 */
function addLead(lead) {
  if (!lead || typeof lead !== 'object') {
    logger.warn('crm-service: addLead called with invalid lead');
    return null;
  }

  const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const record = {
    id,
    ...lead,
    createdAt: new Date().toISOString()
  };

  recentLeads.unshift(record);
  if (recentLeads.length > MAX_RECENT_LEADS) {
    recentLeads.pop();
  }

  logger.info('CRM lead added', { id, name: record.name, company: record.company });
  return record;
}

/**
 * Get recent leads for the demo dashboard.
 * @param {number} limit - Max number to return (default 20)
 * @returns {Array<object>}
 */
function getRecentLeads(limit = 20) {
  const n = Math.min(Math.max(1, parseInt(limit, 10) || 20), MAX_RECENT_LEADS);
  return recentLeads.slice(0, n).map(({ id, name, company, lead_classification, createdAt }) => ({
    id,
    name: name || 'Unknown',
    company: company || '—',
    lead_classification: lead_classification || 'Cold',
    createdAt
  }));
}

module.exports = {
  addLead,
  getRecentLeads
};
