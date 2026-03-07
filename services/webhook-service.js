/**
 * Webhook delivery with timeout and retry. Never breaks API response.
 * Used for n8n workflow webhooks (e.g. email extraction, contact, intake).
 */

const http = require('http');
const https = require('https');
const logger = require('../utils/logger');

const TIMEOUT_MS = 10000;
const RETRY_ATTEMPTS = 2;

/**
 * Send JSON payload to a URL with timeout and optional retries.
 * @param {string} webhookUrl - Full URL
 * @param {object} payload - JSON-serializable object (no secrets)
 * @returns {Promise<{ success: boolean, statusCode?: number }>}
 */
function sendWebhook(webhookUrl, payload) {
  if (!webhookUrl || typeof webhookUrl !== 'string' || !payload) {
    return Promise.resolve({ success: false });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(webhookUrl);
  } catch (e) {
    logger.error('Invalid webhook URL', { url: '[REDACTED]' });
    return Promise.resolve({ success: false });
  }

  const isHttps = parsedUrl.protocol === 'https:';
  const client = isHttps ? https : http;
  const body = JSON.stringify(payload);

  function attempt() {
    return new Promise((resolve) => {
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + (parsedUrl.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = client.request(options, (res) => {
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        if (ok) {
          logger.info('Webhook delivered', { statusCode: res.statusCode });
        } else {
          logger.warn('Webhook non-2xx', { statusCode: res.statusCode });
        }
        resolve({ success: ok, statusCode: res.statusCode });
      });

      req.setTimeout(TIMEOUT_MS, () => {
        req.destroy();
        logger.warn('Webhook timeout');
        resolve({ success: false });
      });

      req.on('error', (err) => {
        logger.error('Webhook request error', { error: err.message });
        resolve({ success: false });
      });

      req.write(body);
      req.end();
    });
  }

  let p = attempt();
  for (let i = 0; i < RETRY_ATTEMPTS; i++) {
    p = p.then((result) => {
      if (result.success) return result;
      return new Promise((r) => setTimeout(r, 1000)).then(attempt);
    });
  }
  return p;
}

module.exports = {
  sendWebhook,
  TIMEOUT_MS
};
