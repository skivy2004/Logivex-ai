/**
 * POST /api/extract-order handler.
 * Accepts { email } or { email_text }. Uses extraction-service and validation.
 * Optionally adds distance_km when both addresses present and Google API key is set.
 */

const extractionService = require('../services/extraction-service');
const distanceService = require('../services/distance-service');
const { sanitizeEmailText } = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * Extract transport order from request body. Body must have `email` or `email_text`.
 * @param {object} body - req.body
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
async function handleExtractOrder(body) {
  const raw = body && (body.email ?? body.email_text);
  const sanitized = sanitizeEmailText(raw);
  if (!sanitized.valid) {
    return { success: false, error: sanitized.error };
  }

  logger.info('Extraction request', { length: sanitized.value.length });
  try {
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
        if (distanceKm != null) result.data.distance_km = distanceKm;
      }
    }
    return result;
  } catch (err) {
    logger.error('Extraction failed', { error: err.message });
    return { success: false, error: err.message };
  }
}

module.exports = {
  handleExtractOrder
};
