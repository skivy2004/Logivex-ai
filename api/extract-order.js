import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const extractionService = require('../services/extraction-service.js');
const distanceService = require('../services/distance-service.js');
const { sanitizeEmailText } = require('../utils/validation.js');
const logger = require('../utils/logger.js');
const { methodNotAllowed, readRequestBody } = require('../lib/serverless-utils.js');

export default async function handler(req, res) {
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
