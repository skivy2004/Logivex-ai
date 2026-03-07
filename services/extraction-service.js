/**
 * Transport order extraction: OpenAI first, then pattern fallback.
 * Normalizes output shape and optionally sends to webhook.
 */

const openaiService = require('./openai-service');
const webhookService = require('./webhook-service');
const logger = require('../utils/logger');

const FIELDS = [
  'pickup_location',
  'delivery_location',
  'cargo_type',
  'quantity',
  'weight',
  'pickup_time'
];

function normalizeValue(data, key) {
  const v = data[key];
  if (key === 'quantity') return v != null ? Number(v) : null;
  if (key === 'weight') return v != null ? String(v) : null;
  return v != null ? String(v) : null;
}

function normalizeExtraction(data) {
  if (!data || typeof data !== 'object') return null;
  const out = {};
  for (const key of FIELDS) {
    out[key] = normalizeValue(data, key);
  }
  return out;
}

/**
 * Pattern-based fallback when OpenAI is unavailable or returns invalid data.
 */
function fallbackExtract(emailText) {
  const fromMatch = emailText.match(/(?:from|pickup|departure)[\s:]+([^\n,]+?)(?=\s+to\s|\.|,|\n|$)/i)
    || emailText.match(/transport\s+from\s+([^\n,.]+)/i);
  const toMatch = emailText.match(/(?:to|delivery|destination)[\s:]+([^\n,.]+)/i)
    || emailText.match(/\bto\s+([A-Za-z]+)(?:\s|\.|,|\n|$)/i);
  const palletMatch = emailText.match(/(\d+)\s*(?:pallets?|pallet)/i);
  const boxMatch = emailText.match(/(\d+)\s*boxes?/i);
  const weightMatch = emailText.match(/(\d+[\s,]?\d*)\s*(?:kg|kilo)/i);
  const timeMatch = emailText.match(/(?:tomorrow|today)\s*at\s*\d{1,2}:\d{2}/i)
    || emailText.match(/(?:pickup|at)\s*(?:tomorrow|today|\d{1,2}:\d{2})/i)
    || emailText.match(/(?:pickup)\s*.*?(\d{1,2}:\d{2})/i);

  const pickup_location = fromMatch ? fromMatch[1].trim() : null;
  const delivery_location = toMatch ? toMatch[1].trim() : null;
  let cargo_type = 'cargo';
  let quantity = null;
  if (palletMatch) {
    cargo_type = 'pallets';
    quantity = parseInt(palletMatch[1], 10);
  } else if (boxMatch) {
    cargo_type = 'boxes';
    quantity = parseInt(boxMatch[1], 10);
  }
  const weight = weightMatch ? `${weightMatch[1].replace(/[\s,]/g, '')}kg` : null;
  const pickup_time = timeMatch ? timeMatch[0].trim() : null;

  return {
    pickup_location,
    delivery_location,
    cargo_type,
    quantity,
    weight,
    pickup_time
  };
}

/**
 * Extract transport order from email text. Tries OpenAI then fallback.
 * If N8N_WEBHOOK_EMAIL is set, sends normalized payload to n8n workflow webhook (non-blocking to API response).
 * @param {string} emailText - Sanitized email body
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
async function extractOrder(emailText) {
  const apiKey = process.env.OPENAI_API_KEY;
  let normalized = null;

  let source = 'fallback';
  if (apiKey) {
    const openaiResult = await openaiService.extractTransportOrder(emailText, apiKey);
    normalized = normalizeExtraction(openaiResult);
    if (normalized) source = 'openai';
  }

  if (!normalized) {
    logger.info('Using fallback extraction');
    normalized = fallbackExtract(emailText);
  }

  const data = { ...normalized, _source: source };

  // Forward to n8n workflow webhook (fire-and-forget, never fail the response)
  const webhookUrl = process.env.N8N_WEBHOOK_EMAIL;
  if (webhookUrl) {
    const { _source, ...payload } = data;
    sendWebhookAsync(webhookUrl, payload);
  }

  return { success: true, data };
}

function sendWebhookAsync(url, payload) {
  webhookService.sendWebhook(url, payload).then((result) => {
    if (!result.success) {
      logger.warn('Webhook delivery failed (async)');
    }
  });
}

module.exports = {
  extractOrder,
  fallbackExtract,
  normalizeExtraction
};
