/**
 * AI lead extraction: OpenAI first, then fallback parsing.
 * Normalizes lead fields and classifies lead (Cold / Warm / Hot).
 */

const openaiService = require('./openai-service');
const logger = require('../utils/logger');

const LEAD_FIELDS = [
  'name',
  'company',
  'email',
  'phone',
  'industry',
  'location',
  'lead_intent',
  'lead_priority'
];

function normalizeValue(data, key) {
  const v = data[key];
  if (v == null || v === '') return null;
  return String(v).trim() || null;
}

function normalizeLead(data) {
  if (!data || typeof data !== 'object') return null;
  const out = {};
  for (const key of LEAD_FIELDS) {
    out[key] = normalizeValue(data, key);
  }
  return out;
}

/**
 * Pattern-based fallback when OpenAI is unavailable or returns invalid data.
 */
function fallbackExtractLead(messageText) {
  const nameMatch = messageText.match(/(?:my name is|i'm|i am|name:)\s*([A-Za-z\s]+?)(?:\s+from|\s*,\s*|\s*\.|\n|$)/i)
    || messageText.match(/(?:^|\n)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*(?:\n|$)/m);
  const companyMatch = messageText.match(/(?:from|company|at)\s+([A-Za-z0-9\s&]+?)(?:\s*\.|\s*\,|\n|$)/i)
    || messageText.match(/(?:we are|we're)\s+([A-Za-z0-9\s&]+?)(?:\s*\.|\n|$)/i);
  const emailMatch = messageText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = messageText.match(/(?:\+?[\d\s\-()]{10,})/);
  const locationMatch = messageText.match(/(?:in|from|based in|location:)\s*([A-Za-z\s,]+?)(?:\s*\.|\n|$)/i);

  let industry = null;
  if (/\b(logistics|transport|shipping|freight|cargo|trucking)\b/i.test(messageText)) {
    industry = 'Logistics';
  } else if (/\b(automation|software|platform)\b/i.test(messageText)) {
    industry = 'Technology';
  }

  let lead_intent = null;
  if (/\binterested in\b/i.test(messageText)) {
    const intentMatch = messageText.match(/interested in\s+([^.]+)/i);
    lead_intent = intentMatch ? intentMatch[1].trim() : 'Interested in product/service';
  } else if (/\bcontact me\b|\bplease contact\b|\breach out\b/i.test(messageText)) {
    lead_intent = 'Requesting contact';
  } else if (/\bquote|pricing|demo\b/i.test(messageText)) {
    lead_intent = 'Requesting quote or demo';
  }

  const name = nameMatch ? nameMatch[1].trim() : null;
  const company = companyMatch ? companyMatch[1].trim() : null;
  const location = locationMatch ? locationMatch[1].trim() : null;

  return {
    name,
    company,
    email: emailMatch ? emailMatch[1].trim() : null,
    phone: phoneMatch ? phoneMatch[0].replace(/\s+/g, ' ').trim() : null,
    industry,
    location,
    lead_intent: lead_intent || 'Inquiry',
    lead_priority: lead_intent ? 'High' : 'Medium'
  };
}

/**
 * Classify lead as Cold, Warm, or Hot based on intent and engagement.
 * Hot: company interested in product, asks for contact.
 * Warm: curiosity or exploration.
 * Cold: generic contact.
 */
function classifyLead(lead) {
  const intent = (lead.lead_intent || '').toLowerCase();
  const priority = (lead.lead_priority || '').toLowerCase();

  if (
    /interested|contact me|please contact|reach out|quote|demo|pricing/.test(intent) ||
    priority === 'high'
  ) {
    return 'Hot';
  }
  if (
    /explor|curious|information|tell me more|learn more/.test(intent) ||
    (lead.company && intent.length > 10)
  ) {
    return 'Warm';
  }
  return 'Cold';
}

/**
 * Extract and classify lead from message text.
 * @param {string} messageText - Sanitized message body
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
async function extractAndClassifyLead(messageText) {
  const apiKey = process.env.OPENAI_API_KEY;
  let normalized = null;
  let source = 'fallback';

  if (apiKey) {
    const openaiResult = await openaiService.extractLeadFromMessage(messageText, apiKey);
    normalized = normalizeLead(openaiResult);
    if (normalized && (normalized.name || normalized.company)) {
      source = 'openai';
    }
  }

  if (!normalized || (!normalized.name && !normalized.company)) {
    logger.info('Using fallback lead extraction');
    normalized = fallbackExtractLead(messageText);
  }

  const classification = classifyLead(normalized);
  const data = {
    ...normalized,
    lead_classification: classification,
    _source: source
  };

  return { success: true, data };
}

module.exports = {
  extractAndClassifyLead,
  classifyLead,
  fallbackExtractLead,
  normalizeLead
};
