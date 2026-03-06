require('dotenv').config();

const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const { calculateTransportPrice } = require('./pricing');
const { demos } = require('./demos');
const { validateEnvironment, getConfig } = require('./config/env');

// Validate environment variables on startup
validateEnvironment();

const app = express();
const config = getConfig();
const PORT = config.port;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/demos', (req, res) => {
  res.redirect('/');
});

app.get('/quote-demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quote-demo', 'index.html'));
});

app.get('/extract-order-demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'extract-order-demo', 'index.html'));
});

app.get('/api/demos', (req, res) => {
  res.json({ demos });
});

app.get('/api/config', (req, res) => {
  res.json({
    googleMapsApiKey: config.googleMapsApiKey
  });
});

app.post('/api/quote', (req, res) => {
  if (!config.webhooks.transportQuote) {
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
    parsedUrl = new URL(config.webhooks.transportQuote);
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

// POST /api/extract-order - Extract transport order details from email text using AI
app.post('/api/extract-order', async (req, res) => {
  const { email_text } = req.body || {};

  if (!email_text || typeof email_text !== 'string') {
    return res.status(400).json({ 
      success: false, 
      message: 'Please provide email text to extract.' 
    });
  }

  // Check if OpenAI API key is configured
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    // Return demo data if OpenAI is not configured
    console.log('OpenAI API key not configured, returning demo data');
    
    // Parse email text for demo purposes (simple pattern matching)
    const pickupMatch = email_text.match(/(?:pickup|from|departure)[\s:]+([^\n,]+)/i);
    const deliveryMatch = email_text.match(/(?:delivery|to|destination)[\s:]+([^\n,]+)/i);
    const palletMatch = email_text.match(/(\d+)\s*(?:pallets?|colli)/i);
    const weightMatch = email_text.match(/(\d+[\s,]*\d*)\s*(?:kg|kilo)/i);
    const dateMatch = email_text.match(/(?:tomorrow|today|next week|\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})/i);

    return res.json({
      pickup: pickupMatch ? pickupMatch[1].trim() : 'Rotterdam',
      delivery: deliveryMatch ? deliveryMatch[1].trim() : 'Milan',
      pallets: palletMatch ? parseInt(palletMatch[1]) : 12,
      weight: weightMatch ? `${weightMatch[1].replace(/[\s,]/g, '')} kg` : '4500 kg',
      pickup_date: dateMatch ? dateMatch[0] : 'Tomorrow',
      source: 'demo-fallback',
      note: 'OpenAI API not configured. Using demo extraction.'
    });
  }

  try {
    // Call OpenAI API for extraction
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a logistics data extraction assistant. Extract transport order details from the provided email text.

Return ONLY a JSON object with these fields:
- pickup: The pickup location (city/address)
- delivery: The delivery destination (city/address)
- pallets: Number of pallets/collo (as integer, null if not mentioned)
- weight: Weight with unit (e.g., "4500 kg", null if not mentioned)
- pickup_date: Pickup date or relative time (e.g., "Tomorrow", "2024-03-15", null if not mentioned)

If a field is not found in the text, return null for that field.
Return valid JSON only, no markdown formatting.`
          },
          {
            role: 'user',
            content: email_text
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      return res.status(502).json({
        success: false,
        message: 'Error extracting order details. Please try again.'
      });
    }

    const openaiData = await openaiResponse.json();
    const aiContent = openaiData.choices?.[0]?.message?.content;

    if (!aiContent) {
      return res.status(502).json({
        success: false,
        message: 'No response from AI service.'
      });
    }

    // Parse the AI response
    let extractedData;
    try {
      extractedData = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      return res.status(502).json({
        success: false,
        message: 'Error parsing extraction results.'
      });
    }

    // Validate and return the extracted data
    res.json({
      pickup: extractedData.pickup || null,
      delivery: extractedData.delivery || null,
      pallets: extractedData.pallets || null,
      weight: extractedData.weight || null,
      pickup_date: extractedData.pickup_date || null,
      source: 'openai'
    });

  } catch (error) {
    console.error('Error in extract-order:', error);
    return res.status(502).json({
      success: false,
      message: 'Error extracting order details. Please try again.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

