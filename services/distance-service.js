/**
 * Distance estimation between two addresses using Google Distance Matrix API.
 * Used to add distance_km to extraction results when GOOGLE_MAPS_API_KEY is set.
 * API failure never breaks the extraction response; we return null and log.
 */

const logger = require('../utils/logger');

const BASE_URL = 'https://maps.googleapis.com/maps/api/distancematrix/json';

/**
 * Get driving distance in km between origin and destination (address strings).
 * @param {string} origin - Pickup address (e.g. "Rotterdam")
 * @param {string} destination - Delivery address (e.g. "Hamburg")
 * @param {string} apiKey - GOOGLE_MAPS_API_KEY
 * @returns {Promise<number|null>} Distance in km or null
 */
async function getDrivingDistanceKm(origin, destination, apiKey) {
  if (!apiKey || !origin || !destination) {
    if (!apiKey) logger.warn('Distance Matrix skipped: no API key');
    return null;
  }

  const trimmedOrigin = String(origin).trim();
  const trimmedDest = String(destination).trim();
  if (!trimmedOrigin || !trimmedDest) return null;

  const params = new URLSearchParams({
    origins: trimmedOrigin,
    destinations: trimmedDest,
    mode: 'driving',
    units: 'metric',
    key: apiKey
  });
  const url = `${BASE_URL}?${params.toString()}`;

  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => null);

    if (!data) {
      logger.warn('Distance Matrix: invalid JSON response');
      return null;
    }

    if (data.status !== 'OK') {
      logger.warn('Distance Matrix API failed', {
        status: data.status,
        error_message: data.error_message || '(none)'
      });
      return null;
    }

    const row = data.rows && data.rows[0];
    const element = row && row.elements && row.elements[0];
    if (!element) {
      logger.warn('Distance Matrix: missing rows[0].elements[0]');
      return null;
    }

    if (element.status !== 'OK') {
      logger.warn('Distance Matrix element not OK', { element_status: element.status });
      return null;
    }

    const valueMeters = element.distance && element.distance.value;
    if (typeof valueMeters !== 'number' || !Number.isFinite(valueMeters)) {
      logger.warn('Distance Matrix: missing or invalid distance.value');
      return null;
    }

    const distance_km = Math.round((valueMeters / 1000) * 10) / 10;
    logger.info('Distance resolved', { distance_km, from: trimmedOrigin, to: trimmedDest });
    return distance_km;
  } catch (err) {
    logger.warn('Distance Matrix request failed', { error: err.message });
    return null;
  }
}

module.exports = {
  getDrivingDistanceKm
};
