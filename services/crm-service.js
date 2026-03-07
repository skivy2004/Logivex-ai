/**
 * In-memory CRM store for demo: recent leads.
 * Not persisted across server restarts.
 */

const { getSupabaseAdmin } = require('../lib/supabaseClient');
const logger = require('../utils/logger');

const MAX_RECENT_LEADS = 50;
const recentLeads = [];

function toLeadSummary(record) {
  return {
    id: record.id,
    name: record.name || 'Unknown',
    company: record.company || '—',
    lead_classification: record.lead_classification || 'Cold',
    createdAt: record.createdAt || record.created_at || new Date().toISOString()
  };
}

async function addLeadToSupabase(record) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { error } = await supabase.from('crm_leads').insert({
    id: record.id,
    name: record.name || null,
    company: record.company || null,
    email: record.email || null,
    phone: record.phone || null,
    industry: record.industry || null,
    location: record.location || null,
    lead_intent: record.lead_intent || null,
    lead_priority: record.lead_priority || null,
    lead_classification: record.lead_classification || 'Cold',
    source: record._source || null,
    created_at: record.createdAt
  });

  if (error) {
    logger.error('CRM Supabase insert failed', { error: error.message });
    return false;
  }

  return true;
}

async function getLeadsFromSupabase(limit) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('crm_leads')
    .select('id, name, company, lead_classification, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('CRM Supabase fetch failed', { error: error.message });
    return null;
  }

  return (data || []).map(toLeadSummary);
}

/**
 * Add a lead to the demo CRM (in memory).
 * @param {object} lead - Lead object with name, company, lead_classification, etc.
 * @returns {object} Stored lead with id and createdAt
 */
async function addLead(lead) {
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

  await addLeadToSupabase(record);
  logger.info('CRM lead added', { id, name: record.name, company: record.company });
  return record;
}

/**
 * Get recent leads for the demo dashboard.
 * @param {number} limit - Max number to return (default 20)
 * @returns {Array<object>}
 */
async function getRecentLeads(limit = 20) {
  const n = Math.min(Math.max(1, parseInt(limit, 10) || 20), MAX_RECENT_LEADS);
  const supabaseLeads = await getLeadsFromSupabase(n);
  if (Array.isArray(supabaseLeads)) {
    return supabaseLeads;
  }

  return recentLeads.slice(0, n).map(toLeadSummary);
}

module.exports = {
  addLead,
  getRecentLeads
};
