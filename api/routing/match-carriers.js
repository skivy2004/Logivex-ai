import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { findMatchingCarriers } = require('../../routing.js');
const { methodNotAllowed, readRequestBody } = require('../../lib/serverless-utils.js');

export default async function handler(req, res) {
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

    const matchingResult = findMatchingCarriers(shipment, filters);
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
