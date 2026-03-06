require('dotenv').config();

const express = require('express');
const path = require('path');
const https = require('https');
const http = require('http');
const { calculateTransportPrice } = require('./pricing');
const { demos } = require('./demos');
const { validateEnvironment, getConfig } = require('./config/env');
const { optimizeRoutes, evaluateRoute, findMatchingCarriers, generateRecommendations, MOCK_CARRIERS } = require('./routing');
const { handleExtractOrder } = require('./api/extract-order');
const { handleCreateLead } = require('./api/create-lead');
const crmService = require('./services/crm-service');
const openaiService = require('./services/openai-service');
const { requireAuth, requireAdmin } = require('./lib/authMiddleware');
const { getSupabaseAdmin } = require('./lib/supabaseClient');
const logger = require('./utils/logger');

// Validate environment variables on startup
validateEnvironment();

const app = express();
const config = getConfig();
const PORT = config.port;

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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

app.get('/email-demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'email-demo', 'index.html'));
});

app.get('/crm-demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'crm-demo', 'index.html'));
});

app.get('/routing-demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'routing-demo', 'index.html'));
});

app.get('/logistics-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logistics-dashboard', 'index.html'));
});

app.get('/api/demos', async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    let statusMap = {};
    if (supabase) {
      const { data: rows } = await supabase.from('features').select('id, status');
      if (Array.isArray(rows)) rows.forEach(r => { statusMap[r.id] = r.status; });
    }
    const merged = demos.map(d => ({
      ...d,
      status: statusMap[d.id] != null ? statusMap[d.id] : d.status
    }));
    res.json({ demos: merged });
  } catch (err) {
    logger.error('Demos fetch error', { error: err.message });
    res.json({ demos });
  }
});

app.get('/api/config', (req, res) => {
  const out = {
    googleMapsApiKey: config.googleMapsApiKey
  };
  if (config.supabaseUrl && config.supabaseAnonKey) {
    out.supabaseUrl = config.supabaseUrl;
    out.supabaseAnonKey = config.supabaseAnonKey;
  }
  res.json(out);
});

// --- Auth & profile ---
app.post('/api/profile', requireAuth, async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ success: false, message: 'Name is required.' });
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ success: false, message: 'Auth not configured.' });
    const { id } = req.authUser;
    const email = req.authUser.email || '';
    const { error } = await supabase.from('users').upsert(
      { id, name, email, role: 'user' },
      { onConflict: 'id' }
    );
    if (error) {
      logger.error('Profile upsert error', { error: error.message });
      return res.status(500).json({ success: false, message: 'Failed to save profile.' });
    }
    res.json({ success: true });
  } catch (err) {
    logger.error('Profile route error', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.userProfile.id,
      email: req.userProfile.email,
      name: req.userProfile.name,
      role: req.userProfile.role || 'user'
    }
  });
});

// --- Admin: features (status) ---
app.get('/api/features', requireAuth, requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ success: false, message: 'Supabase not configured.' });
    const { data, error } = await supabase.from('features').select('id, name, status, updated_at').order('id');
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    const byId = (data || []).reduce((acc, r) => { acc[r.id] = r; return acc; }, {});
    const merged = demos.map(d => ({
      id: d.id,
      name: d.name,
      status: byId[d.id]?.status != null ? byId[d.id].status : d.status,
      updated_at: byId[d.id]?.updated_at || null
    }));
    res.json({ success: true, data: merged });
  } catch (err) {
    logger.error('Features list error', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.patch('/api/features/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id && req.params.id.trim();
    if (!id) return res.status(400).json({ success: false, message: 'Feature id required.' });
    const status = req.body?.status;
    const allowed = ['beta', 'online', 'coming_soon'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Use: beta, online, coming_soon' });
    }
    const supabase = getSupabaseAdmin();
    if (!supabase) return res.status(503).json({ success: false, message: 'Supabase not configured.' });
    const demo = demos.find(d => d.id === id);
    const name = demo ? demo.name : id;
    const { error } = await supabase.from('features').upsert(
      { id, name, status, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );
    if (error) {
      logger.error('Feature update error', { error: error.message });
      return res.status(500).json({ success: false, message: error.message });
    }
    res.json({ success: true, data: { id, name, status } });
  } catch (err) {
    logger.error('Feature patch error', { error: err.message });
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth', 'login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth', 'signup.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'auth', 'admin.html'));
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

// POST /api/extract-order - Extract transport order from email text (AI + fallback)
// Accepts { email } or { email_text }. Response: { success, data } with normalized fields.
app.post('/api/extract-order', async (req, res) => {
  try {
    const result = await handleExtractOrder(req.body || {});
    if (result.success) {
      return res.json({ success: true, data: result.data });
    }
    return res.status(400).json({
      success: false,
      message: result.error || 'Please provide email text to extract.'
    });
  } catch (err) {
    logger.error('Extract-order route error', { error: err.message });
    return res.status(502).json({
      success: false,
      message: 'Error extracting order details. Please try again.'
    });
  }
});

// POST /api/generate-sample-email - Generate a sample transport email using SAMPLE_EMAIL_PROMPT from config (OpenAI, server-side only)
app.post('/api/generate-sample-email', async (req, res) => {
  try {
    const prompt = config.sampleEmailPrompt;
    if (!prompt) {
      return res.status(503).json({
        success: false,
        message: 'Sample email prompt is not configured. Set SAMPLE_EMAIL_PROMPT in .env to enable.'
      });
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        message: 'Sample email generation is not configured. Set OPENAI_API_KEY to enable.'
      });
    }
    const email = await openaiService.generateSampleEmail(prompt, apiKey);
    if (!email) {
      return res.status(502).json({
        success: false,
        message: 'Could not generate sample email. Please try again.'
      });
    }
    return res.json({ success: true, data: { email } });
  } catch (err) {
    logger.error('Generate sample email error', { error: err.message });
    return res.status(502).json({
      success: false,
      message: 'Error generating sample email. Please try again.'
    });
  }
});

// POST /api/create-lead - Extract lead from message, classify, and add to CRM (demo)
app.post('/api/create-lead', async (req, res) => {
  try {
    const result = await handleCreateLead(req.body || {});
    if (result.success) {
      return res.json({ success: true, data: result.data });
    }
    return res.status(400).json({
      success: false,
      message: result.error || 'Please provide a message to analyze.'
    });
  } catch (err) {
    logger.error('Create-lead route error', { error: err.message });
    return res.status(502).json({
      success: false,
      message: 'Error creating lead. Please try again.'
    });
  }
});

// GET /api/leads - Recent leads for CRM demo dashboard (in-memory)
app.get('/api/leads', (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const leads = crmService.getRecentLeads(limit);
    return res.json({ success: true, data: leads });
  } catch (err) {
    logger.error('Leads route error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Error fetching leads.' });
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

