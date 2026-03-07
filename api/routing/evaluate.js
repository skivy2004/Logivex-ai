import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { evaluateRoute } = require('../../routing.js');
const { methodNotAllowed, readRequestBody } = require('../../lib/serverless-utils.js');

export default async function handler(req, res) {
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

    const evaluation = evaluateRoute(routeId, routeOptions);
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
