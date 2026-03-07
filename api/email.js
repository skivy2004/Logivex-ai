import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getConfig } = require('../config/env.js');
const extractionService = require('../services/extraction-service.js');
const distanceService = require('../services/distance-service.js');
const openaiService = require('../services/openai-service.js');
const { sanitizeEmailText } = require('../utils/validation.js');
const logger = require('../utils/logger.js');
const { methodNotAllowed, readRequestBody, getQuery } = require('../lib/serverless-utils.js');

export default async function handler(req, res) {
  try {
    const host = req?.headers?.host || 'localhost';
    const url = new URL(req?.url || '/', `http://${host}`);
    const pathname = url.pathname.replace(/\/+$/, '');
    const query = getQuery(req);
    const action = query.action || '';

    if (action === 'extractOrder' || pathname.endsWith('/extract-order')) {
      return handleExtractOrder(req, res);
    }

    if (action === 'generateSampleEmail' || pathname.endsWith('/generate-sample-email')) {
      return handleGenerateSampleEmail(req, res);
    }

    return res.status(404).json({ success: false, message: 'Email action not found.' });
  } catch (err) {
    console.error('email.js error:', err);
    logger.error('Email handler error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
}

async function handleExtractOrder(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  try {
    const body = await readRequestBody(req);
    const raw = body && (body.email ?? body.email_text);
    const sanitized = sanitizeEmailText(raw);
    if (!sanitized.valid) {
      return res.status(400).json({
        success: false,
        message: sanitized.error || 'Please provide email text to extract.'
      });
    }

    logger.info('Extraction request', { length: sanitized.value.length });
    const result = await extractionService.extractOrder(sanitized.value);
    logger.info('Extraction completed', { source: result.data?._source });

    if (result.success && result.data?.pickup_location && result.data?.delivery_location) {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (apiKey) {
        const distanceKm = await distanceService.getDrivingDistanceKm(
          result.data.pickup_location,
          result.data.delivery_location,
          apiKey
        );
        if (distanceKm != null) {
          result.data.distance_km = distanceKm;
        }
      }
    }

    if (result.success) {
      return res.status(200).json({ success: true, data: result.data });
    }

    return res.status(400).json({
      success: false,
      message: result.error || 'Please provide email text to extract.'
    });
  } catch (err) {
    logger.error('Extract-order route error', { error: err.message });
    return res.status(502).json({
      success: false,
      message: 'Error extracting order details. Please try again.'
    });
  }
}

async function handleGenerateSampleEmail(req, res) {
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
