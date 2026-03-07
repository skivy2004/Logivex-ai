import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const routing = require('../../routing.js');
const { methodNotAllowed, readRequestBody } = require('../../lib/serverless-utils.js');

export default async function handler(req, res) {
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
