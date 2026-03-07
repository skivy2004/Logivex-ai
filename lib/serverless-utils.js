const { URL } = require('url');

function sendJson(res, statusCode, payload) {
  res.status(statusCode).json(payload);
}

function methodNotAllowed(res, allowedMethods) {
  const allow = Array.isArray(allowedMethods) ? allowedMethods : [allowedMethods];
  res.setHeader('Allow', allow.join(', '));
  return sendJson(res, 405, { error: 'Method not allowed' });
}

function getQuery(req) {
  if (req.query && typeof req.query === 'object') {
    return req.query;
  }

  const url = new URL(req.url || '/', 'http://localhost');
  return Object.fromEntries(url.searchParams.entries());
}

async function readRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  let rawBody = '';
  for await (const chunk of req) {
    rawBody += chunk;
  }

  if (!rawBody) {
    return {};
  }

  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('application/json')) {
    return JSON.parse(rawBody);
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(rawBody).entries());
  }

  return { rawBody };
}

function getRequestHost(req) {
  return String(req.headers.host || '').split(':')[0];
}

module.exports = {
  sendJson,
  methodNotAllowed,
  getQuery,
  getRequestHost,
  readRequestBody
};
