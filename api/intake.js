import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getConfig } = require('../config/env.js');
const webhookService = require('../services/webhook-service.js');
const logger = require('../utils/logger.js');
const { methodNotAllowed, readRequestBody } = require('../lib/serverless-utils.js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  const webhookUrl = getConfig().webhooks.n8nAutomationIntake;
  if (!webhookUrl) {
    return res.status(503).json({ success: false, message: 'Intake form is not configured.' });
  }

  try {
    new URL(webhookUrl);
  } catch (error) {
    logger.error('Invalid intake webhook URL', { error: error.message });
    return res.status(500).json({ success: false, message: 'Intake form is misconfigured.' });
  }

  const body = await readRequestBody(req);
  const { name, email, company, answers } = body || {};
  if (!name || !email) {
    return res.status(400).json({ success: false, message: 'Name and email are required.' });
  }

  const payload = {
    name: String(name).trim(),
    email: String(email).trim(),
    company: (company && String(company).trim()) || '',
    answers: answers && typeof answers === 'object' ? answers : {},
    source: 'logivex-automation-intake',
    submittedAt: new Date().toISOString()
  };

  const result = await webhookService.sendWebhook(webhookUrl, payload);
  return res.status(result.success ? 200 : 502).json({
    success: result.success,
    message: result.success
      ? 'Thanks! Our team will review your workflow and get back to you shortly.'
      : 'Something went wrong. Please try again later.'
  });
}
