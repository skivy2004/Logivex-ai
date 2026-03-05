require('dotenv').config();

const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const { calculateTransportPrice } = require('./pricing');
const { demos } = require('./demos');

const app = express();
const PORT = process.env.PORT || 3000;

const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || '';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/demos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo-hub.html'));
});

app.get('/api/demos', (req, res) => {
  res.json({ demos });
});

app.post('/api/quote', (req, res) => {
  if (!MAKE_WEBHOOK_URL) {
    return res.status(500).json({ success: false, message: 'Webhook URL not configured on server.' });
  }

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
    distanceKm,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng
  } = req.body || {};

  if (!pickupAddress || !dropoffAddress || !date || !vehicleType || !customerName || !customerEmail) {
    return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
  }

  // Calculate price centrally so any changes to pricing rules only
  // require updates in pricing.js.
  const normalizedDistanceKm =
    typeof distanceKm === 'number' && Number.isFinite(distanceKm) && distanceKm >= 0
      ? Math.round(distanceKm)
      : null;

  const distanceLabel = normalizedDistanceKm !== null ? `${normalizedDistanceKm} km` : null;

  const calculatedPrice =
    normalizedDistanceKm != null ? calculateTransportPrice(normalizedDistanceKm, vehicleType) : null;

  let parsedUrl;
  try {
    parsedUrl = new URL(MAKE_WEBHOOK_URL);
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Invalid Make.com webhook URL configuration.' });
  }

  const payload = JSON.stringify({
    pickupAddress,
    dropoffAddress,
    date,
    vehicleType,
    customerName,
    customerEmail,
    notes: notes || '',
    weightKg: weightKg || null,
    colli: colli || null,
    cargoType: cargoType || null,
    distanceKm: distanceLabel,
    calculatedPrice: typeof calculatedPrice === 'number' ? calculatedPrice : null,
    pickupLat: typeof pickupLat === 'number' ? pickupLat : null,
    pickupLng: typeof pickupLng === 'number' ? pickupLng : null,
    dropoffLat: typeof dropoffLat === 'number' ? dropoffLat : null,
    dropoffLng: typeof dropoffLng === 'number' ? dropoffLng : null,
    meta: {
      source: 'website-quote-form-v1',
      submittedAt: new Date().toISOString()
    }
  });

  const isHttps = parsedUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (isHttps ? 443 : 80),
    path: parsedUrl.pathname + (parsedUrl.search || ''),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const makeReq = client.request(options, makeRes => {
    let body = '';
    makeRes.on('data', chunk => {
      body += chunk;
    });
    makeRes.on('end', () => {
      const ok = makeRes.statusCode >= 200 && makeRes.statusCode < 300;
      if (!ok) {
        console.error('Make.com webhook responded with status', makeRes.statusCode, 'body:', body);
      }
      return res.status(ok ? 200 : 502).json({
        success: ok,
        message: ok ? 'Quote submitted successfully. You will receive an email shortly.' : 'There was a problem sending your quote. Please try again later.'
      });
    });
  });

  makeReq.on('error', err => {
    console.error('Error calling Make.com webhook:', err);
    return res.status(502).json({ success: false, message: 'Error contacting quote service. Please try again later.' });
  });

  makeReq.write(payload);
  makeReq.end();
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

