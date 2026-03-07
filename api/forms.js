const { calculateTransportPrice } = require('../pricing.js');
const { getConfig } = require('../config/env.js');
const webhookService = require('../services/webhook-service.js');
const logger = require('../utils/logger.js');
const { methodNotAllowed, readRequestBody } = require('../lib/serverless-utils.js');

module.exports = async function handler(req, res) {
  try {
    const host = req?.headers?.host || 'localhost';
    const url = new URL(req?.url || '/', `http://${host}`);
    const action = url.searchParams.get('action');
    const pathname = url.pathname.replace(/\/+$/, '');

    if (action === 'quote' || pathname.endsWith('/quote')) {
      return handleQuote(req, res);
    }

    if (action === 'contact' || pathname.endsWith('/contact')) {
      return handleContact(req, res);
    }

    if (action === 'intake' || pathname.endsWith('/intake')) {
      return handleIntake(req, res);
    }

    return res.status(404).json({ success: false, message: 'Form action not found.' });
  } catch (err) {
    console.error('forms.js error:', err);
    logger.error('Forms handler error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

async function handleQuote(req, res) {
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

async function handleContact(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  const webhookUrl = getConfig().webhooks.n8nContact;
  if (!webhookUrl) {
    return res.status(503).json({ success: false, message: 'Contact form is not configured.' });
  }

  try {
    new URL(webhookUrl);
  } catch (error) {
    logger.error('Invalid contact webhook URL', { error: error.message });
    return res.status(500).json({ success: false, message: 'Contact form is misconfigured.' });
  }

  const body = await readRequestBody(req);
  const { name, email, company, message } = body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
  }

  const payload = {
    name: String(name).trim(),
    email: String(email).trim(),
    company: (company && String(company).trim()) || '',
    message: String(message).trim(),
    source: 'logivex-contact-modal',
    submittedAt: new Date().toISOString()
  };

  const result = await webhookService.sendWebhook(webhookUrl, payload);
  return res.status(result.success ? 200 : 502).json({
    success: result.success,
    message: result.success
      ? "Message sent. We'll get back to you soon."
      : 'Something went wrong. Please try again later.'
  });
}

async function handleIntake(req, res) {
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
