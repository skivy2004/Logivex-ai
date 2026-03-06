/**
 * POST /api/create-lead handler.
 * Accepts { message } or { message_text }. Uses ai-lead-extraction and crm-service.
 * Returns created lead with classification; never exposes API keys.
 */

const aiLeadExtraction = require('../services/ai-lead-extraction');
const crmService = require('../services/crm-service');
const { sanitizeEmailText } = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * Create lead from request body. Body must have `message` or `message_text`.
 * @param {object} body - req.body
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
async function handleCreateLead(body) {
  const raw = body && (body.message ?? body.message_text);
  const sanitized = sanitizeEmailText(raw);
  if (!sanitized.valid) {
    return { success: false, error: sanitized.error };
  }

  logger.info('Create-lead request', { length: sanitized.value.length });

  try {
    const { success, data: extracted, error } = await aiLeadExtraction.extractAndClassifyLead(sanitized.value);
    if (!success || !extracted) {
      return { success: false, error: error || 'Failed to extract lead from message.' };
    }

    const lead = crmService.addLead(extracted);
    if (!lead) {
      return { success: false, error: 'Failed to save lead to CRM.' };
    }

    const { _source, ...payload } = lead;
    return {
      success: true,
      data: {
        ...payload,
        _source
      }
    };
  } catch (err) {
    logger.error('Create-lead failed', { error: err.message });
    return { success: false, error: err.message };
  }
}

module.exports = {
  handleCreateLead
};
