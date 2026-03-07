import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { MOCK_CARRIERS } = require('../../routing.js');
const { methodNotAllowed, getQuery } = require('../../lib/serverless-utils.js');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  try {
    const query = getQuery(req);
    if (query.id) {
      return handleCarrierDetail(query.id, res);
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

  let carriers = MOCK_CARRIERS.map((carrier) => ({
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
  const carrier = MOCK_CARRIERS.find((item) => item.id === id);
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
