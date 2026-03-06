require('dotenv').config();

const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const { calculateTransportPrice } = require('./pricing');
const { demos } = require('./demos');
const { validateEnvironment, getConfig } = require('./config/env');
const { optimizeRoutes, evaluateRoute, findMatchingCarriers, generateRecommendations, MOCK_CARRIERS } = require('./routing');

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

app.get('/routing-demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'routing-demo', 'index.html'));
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
    cargoItems,
    totalCargoUnits,
    otherCargoDescription,
    calculatedPrice: clientCalculatedPrice,
    distanceKm,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng
  } = req.body || {};

  // Validate required fields (no vehicle, weight, colli — quote-demo uses cargo items)
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

  const distanceLabel = normalizedDistanceKm !== null ? `${normalizedDistanceKm} km` : null;

  const calculatedPrice =
    typeof clientCalculatedPrice === 'number' && Number.isFinite(clientCalculatedPrice)
      ? clientCalculatedPrice
      : normalizedDistanceKm != null && vehicleType
        ? calculateTransportPrice(normalizedDistanceKm, vehicleType)
        : null;

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

// ============================================================================
// AI Routing Agent API Endpoints
// ============================================================================

// POST /api/routing/optimize - Optimize routes for a shipment
app.post('/api/routing/optimize', async (req, res) => {
  try {
    const { 
      pickupLocation, 
      deliveryLocation, 
      pallets, 
      weightKg, 
      cargoType, 
      deadline,
      options = {}
    } = req.body || {};

    // Validate required fields
    if (!pickupLocation || !deliveryLocation || !pallets || !weightKg) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pickupLocation, deliveryLocation, pallets, weightKg'
      });
    }

    // Validate location objects
    if (!pickupLocation.lat || !pickupLocation.lng || !pickupLocation.city) {
      return res.status(400).json({
        success: false,
        message: 'pickupLocation must include lat, lng, and city'
      });
    }

    if (!deliveryLocation.lat || !deliveryLocation.lng || !deliveryLocation.city) {
      return res.status(400).json({
        success: false,
        message: 'deliveryLocation must include lat, lng, and city'
      });
    }

    const shipment = {
      pickupLocation,
      deliveryLocation,
      pallets: parseInt(pallets, 10),
      weightKg: parseInt(weightKg, 10),
      cargoType: cargoType || 'general',
      deadline: deadline || null
    };

    // Get optimized routes
    const optimizationResult = await optimizeRoutes(shipment);

    // Generate AI recommendations
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const recommendations = await generateRecommendations(optimizationResult, openaiApiKey);

    res.json({
      success: true,
      data: {
        ...optimizationResult,
        recommendations
      }
    });

  } catch (error) {
    console.error('Error in route optimization:', error);
    res.status(500).json({
      success: false,
      message: 'Error optimizing routes. Please try again.'
    });
  }
});

// POST /api/routing/evaluate - Evaluate a specific route
app.post('/api/routing/evaluate', (req, res) => {
  try {
    const { routeId, routeOptions } = req.body || {};

    if (!routeId || !routeOptions || !Array.isArray(routeOptions)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: routeId, routeOptions (array)'
      });
    }

    const evaluation = evaluateRoute(routeId, routeOptions);

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Route not found in provided options'
      });
    }

    res.json({
      success: true,
      data: evaluation
    });

  } catch (error) {
    console.error('Error in route evaluation:', error);
    res.status(500).json({
      success: false,
      message: 'Error evaluating route. Please try again.'
    });
  }
});

// POST /api/routing/match-carriers - Find matching carriers for a shipment
app.post('/api/routing/match-carriers', (req, res) => {
  try {
    const { 
      pickupLocation, 
      deliveryLocation, 
      pallets, 
      weightKg,
      filters = {}
    } = req.body || {};

    if (!pickupLocation || !deliveryLocation || !pallets || !weightKg) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pickupLocation, deliveryLocation, pallets, weightKg'
      });
    }

    const shipment = {
      pickupLocation,
      deliveryLocation,
      pallets: parseInt(pallets, 10),
      weightKg: parseInt(weightKg, 10)
    };

    const matchingResult = findMatchingCarriers(shipment, filters);

    res.json({
      success: true,
      data: matchingResult
    });

  } catch (error) {
    console.error('Error in carrier matching:', error);
    res.status(500).json({
      success: false,
      message: 'Error matching carriers. Please try again.'
    });
  }
});

// GET /api/routing/carriers - List all available carriers
app.get('/api/routing/carriers', (req, res) => {
  try {
    const { country, vehicleType, minRating } = req.query;
    
    let carriers = MOCK_CARRIERS.map(c => ({
      id: c.id,
      name: c.name,
      location: c.location,
      capacity: c.capacity,
      vehicleTypes: c.vehicleTypes,
      operatingCountries: c.operatingCountries,
      rating: c.rating,
      completedShipments: c.completedShipments,
      availability: c.availability,
      baseRate: c.baseRate
    }));

    // Apply filters if provided
    if (country) {
      carriers = carriers.filter(c => c.operatingCountries.includes(country.toUpperCase()));
    }
    
    if (vehicleType) {
      carriers = carriers.filter(c => c.vehicleTypes.includes(vehicleType.toLowerCase()));
    }
    
    if (minRating) {
      const minRatingNum = parseFloat(minRating);
      carriers = carriers.filter(c => c.rating >= minRatingNum);
    }

    res.json({
      success: true,
      data: {
        carriers,
        total: carriers.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching carriers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching carriers. Please try again.'
    });
  }
});

// GET /api/routing/carriers/:id - Get specific carrier details
app.get('/api/routing/carriers/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const carrier = MOCK_CARRIERS.find(c => c.id === id);
    
    if (!carrier) {
      return res.status(404).json({
        success: false,
        message: 'Carrier not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: carrier.id,
        name: carrier.name,
        location: carrier.location,
        capacity: carrier.capacity,
        vehicleTypes: carrier.vehicleTypes,
        operatingCountries: carrier.operatingCountries,
        rating: carrier.rating,
        completedShipments: carrier.completedShipments,
        baseRate: carrier.baseRate,
        availability: carrier.availability
      }
    });

  } catch (error) {
    console.error('Error fetching carrier:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching carrier details. Please try again.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

