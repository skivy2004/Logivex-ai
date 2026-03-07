const routing = require('../routing.js');
const { methodNotAllowed, readRequestBody, getQuery } = require('../lib/serverless-utils.js');

module.exports = async function handler(req, res) {
  try {
    const host = req?.headers?.host || 'localhost';
    const url = new URL(req?.url || '/', `http://${host}`);
    const pathname = url.pathname.replace(/\/+$/, '');
    const query = getQuery(req);
    const action = query.action || '';

    if (action === 'optimize' || pathname.endsWith('/routing/optimize')) {
      return handleOptimize(req, res);
    }

    if (action === 'evaluate' || pathname.endsWith('/routing/evaluate')) {
      return handleEvaluate(req, res);
    }

    if (action === 'matchCarriers' || pathname.endsWith('/routing/match-carriers')) {
      return handleMatchCarriers(req, res);
    }

    if (
      action === 'carriers' ||
      action === 'carrier' ||
      pathname.endsWith('/routing/carriers')
    ) {
      return handleCarriers(req, res, query, pathname);
    }

    return res.status(404).json({ success: false, message: 'Routing action not found.' });
  } catch (err) {
    console.error('routing.js error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

async function handleOptimize(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  try {
    const body = await readRequestBody(req);
    const { pickupLocation, deliveryLocation, pallets, weightKg, cargoType, deadline } = body || {};

    if (!pickupLocation || !deliveryLocation || !pallets || !weightKg) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pickupLocation, deliveryLocation, pallets, weightKg'
      });
    }

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

    const optimizationResult = await routing.optimizeRoutes(shipment);
    const recommendations = await routing.generateRecommendations(
      optimizationResult,
      process.env.OPENAI_API_KEY
    );

    return res.status(200).json({
      success: true,
      data: {
        ...optimizationResult,
        recommendations
      }
    });
  } catch (error) {
    console.error('Error in route optimization:', error);
    return res.status(500).json({
      success: false,
      message: 'Error optimizing routes. Please try again.'
    });
  }
}

async function handleEvaluate(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  try {
    const body = await readRequestBody(req);
    const { routeId, routeOptions } = body || {};

    if (!routeId || !routeOptions || !Array.isArray(routeOptions)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: routeId, routeOptions (array)'
      });
    }

    const evaluation = routing.evaluateRoute(routeId, routeOptions);
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: 'Route not found in provided options'
      });
    }

    return res.status(200).json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    console.error('Error in route evaluation:', error);
    return res.status(500).json({
      success: false,
      message: 'Error evaluating route. Please try again.'
    });
  }
}

async function handleMatchCarriers(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  try {
    const body = await readRequestBody(req);
    const { pickupLocation, deliveryLocation, pallets, weightKg, filters = {} } = body || {};

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

    const matchingResult = routing.findMatchingCarriers(shipment, filters);
    return res.status(200).json({
      success: true,
      data: matchingResult
    });
  } catch (error) {
    console.error('Error in carrier matching:', error);
    return res.status(500).json({
      success: false,
      message: 'Error matching carriers. Please try again.'
    });
  }
}

async function handleCarriers(req, res, query, pathname) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  try {
    const pathMatch = pathname.match(/\/routing\/carriers\/([^/]+)$/);
    const carrierId = query.id || (pathMatch ? decodeURIComponent(pathMatch[1]) : '');

    if (carrierId || query.action === 'carrier' || pathMatch) {
      return handleCarrierDetail(carrierId, res);
    }

    return handleCarrierList(query, res);
  } catch (error) {
    console.error('Error fetching carrier data:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching carrier data. Please try again.'
    });
  }
}

function handleCarrierList(query, res) {
  const { country, vehicleType, minRating } = query;

  let carriers = routing.MOCK_CARRIERS.map((carrier) => ({
    id: carrier.id,
    name: carrier.name,
    location: carrier.location,
    capacity: carrier.capacity,
    vehicleTypes: carrier.vehicleTypes,
    operatingCountries: carrier.operatingCountries,
    rating: carrier.rating,
    completedShipments: carrier.completedShipments,
    availability: carrier.availability,
    baseRate: carrier.baseRate
  }));

  if (country) {
    carriers = carriers.filter((carrier) => carrier.operatingCountries.includes(String(country).toUpperCase()));
  }

  if (vehicleType) {
    carriers = carriers.filter((carrier) =>
      carrier.vehicleTypes.includes(String(vehicleType).toLowerCase())
    );
  }

  if (minRating) {
    const minRatingNum = parseFloat(minRating);
    carriers = carriers.filter((carrier) => carrier.rating >= minRatingNum);
  }

  return res.status(200).json({
    success: true,
    data: {
      carriers,
      total: carriers.length,
      timestamp: new Date().toISOString()
    }
  });
}

function handleCarrierDetail(id, res) {
  const carrier = routing.MOCK_CARRIERS.find((item) => item.id === id);
  if (!carrier) {
    return res.status(404).json({
      success: false,
      message: 'Carrier not found'
    });
  }

  return res.status(200).json({
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
}
