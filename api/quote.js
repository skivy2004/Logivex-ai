import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { calculateTransportPrice } = require('../pricing.js');
const { getConfig } = require('../config/env.js');
const webhookService = require('../services/webhook-service.js');
const { methodNotAllowed, readRequestBody } = require('../lib/serverless-utils.js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  const config = getConfig();
  const webhookUrl = config.webhooks.n8nTransportQuote;
  if (!webhookUrl) {
    return res.status(500).json({ success: false, message: 'Webhook URL not configured on server.' });
  }

  try {
    new URL(webhookUrl);
  } catch (_) {
    return res.status(500).json({ success: false, message: 'Invalid n8n webhook URL configuration.' });
  }

  const body = await readRequestBody(req);
  const {
    pickupAddress,
    dropoffAddress,
    date,
    vehicleType,
    customerName,
    customerEmail,
    notes,
    weightKg,
    colli,
    cargoType,
    cargoItems,
    totalCargoUnits,
    otherCargoDescription,
    calculatedPrice: clientCalculatedPrice,
    distanceKm,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng
  } = body || {};

  if (!pickupAddress || !dropoffAddress || !date || !customerName || !customerEmail) {
    return res.status(400).json({ success: false, message: 'Please complete all shipment details.' });
  }

  const hasCargoItems = Array.isArray(cargoItems) && cargoItems.length > 0;
  if (!hasCargoItems) {
    return res.status(400).json({ success: false, message: 'Please add at least one cargo item.' });
  }

  const normalizedDistanceKm =
    typeof distanceKm === 'number' && Number.isFinite(distanceKm) && distanceKm >= 0
      ? Math.round(distanceKm)
      : null;

  const calculatedPrice =
    typeof clientCalculatedPrice === 'number' && Number.isFinite(clientCalculatedPrice)
      ? clientCalculatedPrice
      : normalizedDistanceKm != null && vehicleType
        ? calculateTransportPrice(normalizedDistanceKm, vehicleType)
        : null;

  const payload = {
    pickupAddress,
    dropoffAddress,
    date,
    vehicleType: vehicleType || null,
    customerName,
    customerEmail,
    notes: notes || '',
    weightKg: weightKg || null,
    colli: colli || null,
    cargoType: cargoType || null,
    cargoItems: cargoItems || null,
    totalCargoUnits: typeof totalCargoUnits === 'number' ? totalCargoUnits : null,
    otherCargoDescription: otherCargoDescription || null,
    distanceKm: normalizedDistanceKm != null ? `${normalizedDistanceKm} km` : null,
    calculatedPrice: typeof calculatedPrice === 'number' ? calculatedPrice : null,
    pickupLat: typeof pickupLat === 'number' ? pickupLat : null,
    pickupLng: typeof pickupLng === 'number' ? pickupLng : null,
    dropoffLat: typeof dropoffLat === 'number' ? dropoffLat : null,
    dropoffLng: typeof dropoffLng === 'number' ? dropoffLng : null,
    meta: {
      source: 'website-quote-form-v1',
      submittedAt: new Date().toISOString()
    }
  };

  const result = await webhookService.sendWebhook(webhookUrl, payload);
  return res.status(result.success ? 200 : 502).json({
    success: result.success,
    message: result.success
      ? 'Quote submitted successfully. You will receive an email shortly.'
      : 'There was a problem sending your quote. Please try again later.'
  });
}
