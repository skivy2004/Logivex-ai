// pricing.js
// Central pricing configuration for transport quotes.
// Adjust prices here without touching the rest of the code.

const PRICING = {
  // Base fee added to every transport (flat starting cost).
  startFee: 25,

  // Cost per kilometer before vehicle multiplier is applied.
  pricePerKm: 0.9,

  // Vehicle price multipliers – tweak these to make certain
  // vehicles relatively more or less expensive.
  vehicleFactor: {
    van: 0.9,
    'box truck': 1.3,
    trailer: 1.6,
    other: 1.2
  }
};

/**
 * Calculate the transport price in the application's base currency.
 * Prices are derived from the central PRICING configuration so you can
 * change behaviour by editing this file only.
 *
 * @param {number} distanceKm - Distance in kilometers for the transport.
 * @param {string} vehicleType - Vehicle type label used as a key in vehicleFactor.
 * @returns {number} Calculated price rounded to two decimals.
 */
function calculateTransportPrice(distanceKm, vehicleType) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm < 0) {
    return 0;
  }

  const normalizedType = (vehicleType || '').toString().toLowerCase();
  const factor = PRICING.vehicleFactor[normalizedType] || 1;

  const price = (PRICING.startFee + distanceKm * PRICING.pricePerKm) * factor;

  return Number(price.toFixed(2));
}

module.exports = {
  PRICING,
  calculateTransportPrice
};

