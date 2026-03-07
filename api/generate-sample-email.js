import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getConfig } = require('../config/env.js');
const openaiService = require('../services/openai-service.js');
const logger = require('../utils/logger.js');
const { methodNotAllowed } = require('../lib/serverless-utils.js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  try {
    const prompt = getConfig().sampleEmailPrompt;
    if (!prompt) {
      return res.status(503).json({
        success: false,
        message: 'Sample email prompt is not configured. Set SAMPLE_EMAIL_PROMPT in .env to enable.'
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: 'Sample email generation is not configured. Set OPENAI_API_KEY to enable.'
      });
    }

    const email = await openaiService.generateSampleEmail(prompt, apiKey);
    if (!email) {
      return res.status(502).json({
        success: false,
        message: 'Could not generate sample email. Please try again.'
      });
    }

    return res.status(200).json({ success: true, data: { email } });
  } catch (err) {
    logger.error('Generate sample email error', { error: err.message });
    return res.status(502).json({
      success: false,
      message: 'Error generating sample email. Please try again.'
    });
  }
}
