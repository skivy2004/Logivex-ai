import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const aiLeadExtraction = require('../services/ai-lead-extraction.js');
const crmService = require('../services/crm-service.js');
const { sanitizeEmailText } = require('../utils/validation.js');
const logger = require('../utils/logger.js');
const { methodNotAllowed, readRequestBody } = require('../lib/serverless-utils.js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  try {
    const body = await readRequestBody(req);
    const raw = body && (body.message ?? body.message_text);
    const sanitized = sanitizeEmailText(raw);
    if (!sanitized.valid) {
      return res.status(400).json({
        success: false,
        message: sanitized.error || 'Please provide a message to analyze.'
      });
    }

    logger.info('Create-lead request', { length: sanitized.value.length });
    const { success, data: extracted, error } = await aiLeadExtraction.extractAndClassifyLead(
      sanitized.value
    );

    if (!success || !extracted) {
      return res.status(400).json({
        success: false,
        message: error || 'Failed to extract lead from message.'
      });
    }

    const lead = await crmService.addLead(extracted);
    if (!lead) {
      return res.status(400).json({
        success: false,
        message: 'Failed to save lead to CRM.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...lead
      }
    });
  } catch (err) {
    logger.error('Create-lead route error', { error: err.message });
    return res.status(502).json({
      success: false,
      message: 'Error creating lead. Please try again.'
    });
  }
}
