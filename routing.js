// routing.js
// AI Routing Agent - Route optimization, carrier matching, and recommendations

const { calculateTransportPrice } = require('./pricing');

// ============================================================================
// Carrier Database (Mock data for demonstration)
// ============================================================================

const MOCK_CARRIERS = [
  {
    id: 'carrier-001',
    name: 'EuroTrans Logistics',
    location: { lat: 52.5200, lng: 13.4050, city: 'Berlin', country: 'DE' },
    capacity: { pallets: 33, weightKg: 24000 },
    vehicleTypes: ['van', 'box truck', 'trailer'],
    operatingCountries: ['DE', 'NL', 'BE', 'FR', 'PL'],
    rating: 4.8,
    completedShipments: 1250,
    baseRate: 0.85,
    availability: 'available'
  },
  {
    id: 'carrier-002',
    name: 'Benelux Transport BV',
    location: { lat: 51.9225, lng: 4.4792, city: 'Rotterdam', country: 'NL' },
    capacity: { pallets: 18, weightKg: 12000 },
    vehicleTypes: ['van', 'box truck'],
    operatingCountries: ['NL', 'BE', 'DE', 'FR'],
    rating: 4.6,
    completedShipments: 890,
    baseRate: 0.75,
    availability: 'available'
  },
  {
    id: 'carrier-003',
    name: 'Milan Express SRL',
    location: { lat: 45.4642, lng: 9.1900, city: 'Milan', country: 'IT' },
    capacity: { pallets: 33, weightKg: 24000 },
    vehicleTypes: ['box truck', 'trailer'],
    operatingCountries: ['IT', 'FR', 'CH', 'AT', 'SI'],
    rating: 4.5,
    completedShipments: 670,
    baseRate: 0.90,
    availability: 'available'
  },
  {
    id: 'carrier-004',
    name: 'Paris Freight Solutions',
    location: { lat: 48.8566, lng: 2.3522, city: 'Paris', country: 'FR' },
    capacity: { pallets: 15, weightKg: 3500 },
    vehicleTypes: ['van'],
    operatingCountries: ['FR', 'BE', 'LU', 'CH'],
    rating: 4.9,
    completedShipments: 2100,
    baseRate: 0.95,
    availability: 'busy'
  },
  {
    id: 'carrier-005',
    name: 'Nordic Cargo Group',
    location: { lat: 59.3293, lng: 18.0686, city: 'Stockholm', country: 'SE' },
    capacity: { pallets: 33, weightKg: 24000 },
    vehicleTypes: ['trailer'],
    operatingCountries: ['SE', 'NO', 'DK', 'FI', 'DE', 'PL'],
    rating: 4.7,
    completedShipments: 540,
    baseRate: 0.88,
    availability: 'available'
  },
  {
    id: 'carrier-006',
    name: 'Vienna Transport GmbH',
    location: { lat: 48.2082, lng: 16.3738, city: 'Vienna', country: 'AT' },
    capacity: { pallets: 24, weightKg: 18000 },
    vehicleTypes: ['box truck', 'trailer'],
    operatingCountries: ['AT', 'DE', 'CZ', 'SK', 'HU', 'IT'],
    rating: 4.4,
    completedShipments: 420,
    baseRate: 0.82,
    availability: 'available'
  }
];

// ============================================================================
// Route Optimization Algorithms
// ============================================================================

/**
 * Calculate Haversine distance between two coordinates
 */
function calculateHaversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate distance from carrier to pickup location
 */
function calculateCarrierPickupDistance(carrier, pickupLocation) {
  return calculateHaversineDistance(
    carrier.location.lat,
    carrier.location.lng,
    pickupLocation.lat,
    pickupLocation.lng
  );
}

/**
 * Score a carrier match based on multiple factors
 */
function scoreCarrierMatch(carrier, shipment, routeDistance) {
  const scores = {
    capacity: 0,
    proximity: 0,
    coverage: 0,
    rating: 0,
    availability: 0,
    price: 0
  };

  // Capacity score (can carrier handle the shipment?)
  const palletRatio = shipment.pallets / carrier.capacity.pallets;
  const weightRatio = shipment.weightKg / carrier.capacity.weightKg;
  const maxRatio = Math.max(palletRatio, weightRatio);
  
  if (maxRatio > 1) {
    scores.capacity = 0; // Cannot handle
  } else if (maxRatio <= 0.5) {
    scores.capacity = 100; // Plenty of capacity
  } else {
    scores.capacity = 100 - ((maxRatio - 0.5) / 0.5) * 50; // 100 to 50
  }

  // Proximity score (closer is better)
  const pickupDistance = calculateCarrierPickupDistance(carrier, shipment.pickupLocation);
  const maxAcceptableDistance = 500; // km
  if (pickupDistance > maxAcceptableDistance) {
    scores.proximity = Math.max(0, 100 - ((pickupDistance - maxAcceptableDistance) / 500) * 50);
  } else {
    scores.proximity = Math.max(20, 100 - (pickupDistance / maxAcceptableDistance) * 80);
  }

  // Coverage score (can carrier operate in both countries?)
  const canPickup = carrier.operatingCountries.includes(shipment.pickupLocation.country);
  const canDeliver = carrier.operatingCountries.includes(shipment.deliveryLocation.country);
  scores.coverage = (canPickup && canDeliver) ? 100 : (canPickup || canDeliver) ? 50 : 0;

  // Rating score (higher rated carriers get better scores)
  scores.rating = (carrier.rating / 5) * 100;

  // Availability score
  scores.availability = carrier.availability === 'available' ? 100 : 
                       carrier.availability === 'busy' ? 60 : 30;

  // Price score (lower base rate is better)
  const avgRate = 0.85;
  scores.price = Math.max(0, Math.min(100, (avgRate / carrier.baseRate) * 100));

  // Calculate weighted total score
  const weights = {
    capacity: 0.20,
    proximity: 0.20,
    coverage: 0.25,
    rating: 0.15,
    availability: 0.10,
    price: 0.10
  };

  const totalScore = Object.keys(scores).reduce((sum, key) => {
    return sum + scores[key] * weights[key];
  }, 0);

  return {
    total: Math.round(totalScore),
    breakdown: scores,
    pickupDistance: Math.round(pickupDistance),
    estimatedPrice: calculateEstimatedPrice(carrier, routeDistance, shipment)
  };
}

/**
 * Calculate estimated price for a carrier
 */
function calculateEstimatedPrice(carrier, distance, shipment) {
  const basePrice = calculateTransportPrice(distance, 'van');
  const capacityUtilization = Math.max(
    shipment.pallets / carrier.capacity.pallets,
    shipment.weightKg / carrier.capacity.weightKg
  );
  
  // Adjust price based on carrier base rate and utilization
  const adjustedPrice = basePrice * (carrier.baseRate / 0.9) * (0.8 + capacityUtilization * 0.4);
  
  return Math.round(adjustedPrice * 100) / 100;
}

// ============================================================================
// Route Optimization
// ============================================================================

/**
 * Find optimal routes for a shipment
 */
async function optimizeRoutes(shipment) {
  const { pickupLocation, deliveryLocation, pallets, weightKg, cargoType, deadline } = shipment;
  
  // Calculate route distance
  const routeDistance = calculateHaversineDistance(
    pickupLocation.lat,
    pickupLocation.lng,
    deliveryLocation.lat,
    deliveryLocation.lng
  );

  // Score and rank all carriers
  const carrierMatches = MOCK_CARRIERS.map(carrier => {
    const matchScore = scoreCarrierMatch(carrier, shipment, routeDistance);
    return {
      carrier,
      score: matchScore,
      rank: 0 // Will be assigned after sorting
    };
  });

  // Sort by total score descending
  carrierMatches.sort((a, b) => b.score.total - a.score.total);
  
  // Assign ranks
  carrierMatches.forEach((match, index) => {
    match.rank = index + 1;
  });

  // Generate route options
  const routeOptions = carrierMatches.map(match => ({
    id: `route-${match.carrier.id}-${Date.now()}`,
    carrier: {
      id: match.carrier.id,
      name: match.carrier.name,
      rating: match.carrier.rating,
      completedShipments: match.carrier.completedShipments,
      location: match.carrier.location
    },
    route: {
      pickup: pickupLocation,
      delivery: deliveryLocation,
      distance: Math.round(routeDistance),
      pickupDistance: match.score.pickupDistance,
      totalDistance: Math.round(routeDistance + match.score.pickupDistance)
    },
    matchScore: {
      total: match.score.total,
      breakdown: match.score.breakdown,
      rank: match.rank
    },
    pricing: {
      estimatedPrice: match.score.estimatedPrice,
      baseRate: match.carrier.baseRate,
      currency: 'EUR'
    },
    timing: {
      estimatedHours: Math.round((routeDistance + match.score.pickupDistance) / 80 + 2), // ~80km/h average + handling
      deadline: deadline || null
    },
    vehicle: {
      recommendedType: selectVehicleType(pallets, weightKg),
      availableTypes: match.carrier.vehicleTypes
    }
  }));

  return {
    shipment: {
      id: `shipment-${Date.now()}`,
      pickupLocation,
      deliveryLocation,
      pallets,
      weightKg,
      cargoType
    },
    routeOptions: routeOptions.slice(0, 5), // Return top 5 options
    meta: {
      totalCarriersChecked: MOCK_CARRIERS.length,
      optimizationTimestamp: new Date().toISOString(),
      algorithm: 'multi-factor-scoring-v1'
    }
  };
}

/**
 * Select recommended vehicle type based on shipment specs
 */
function selectVehicleType(pallets, weightKg) {
  if (pallets <= 3 && weightKg <= 3500) return 'van';
  if (pallets <= 18 && weightKg <= 12000) return 'box truck';
  return 'trailer';
}

// ============================================================================
// AI Routing Agent - Advanced Recommendations
// ============================================================================

/**
 * Generate AI-powered routing recommendations
 */
async function generateRecommendations(routeData, openaiApiKey) {
  const recommendations = [];
  
  // 1. Best Value Recommendation
  const bestValue = routeData.routeOptions
    .filter(r => r.matchScore.total >= 70)
    .sort((a, b) => a.pricing.estimatedPrice - b.pricing.estimatedPrice)[0];
  
  if (bestValue) {
    recommendations.push({
      type: 'best_value',
      title: 'Best Value Option',
      description: `${bestValue.carrier.name} offers the most competitive price at €${bestValue.pricing.estimatedPrice} while maintaining excellent service quality (Rating: ${bestValue.carrier.rating}/5).`,
      routeId: bestValue.id,
      confidence: 0.92
    });
  }

  // 2. Fastest Delivery Recommendation
  const fastest = routeData.routeOptions
    .sort((a, b) => a.timing.estimatedHours - b.timing.estimatedHours)[0];
  
  if (fastest) {
    recommendations.push({
      type: 'fastest',
      title: 'Fastest Delivery',
      description: `${fastest.carrier.name} can complete this shipment in approximately ${fastest.timing.estimatedHours} hours, including pickup time.`,
      routeId: fastest.id,
      confidence: 0.88
    });
  }

  // 3. Most Reliable Recommendation
  const mostReliable = routeData.routeOptions
    .sort((a, b) => b.carrier.rating - a.carrier.rating)[0];
  
  if (mostReliable) {
    recommendations.push({
      type: 'most_reliable',
      title: 'Most Reliable Choice',
      description: `${mostReliable.carrier.name} has an outstanding ${mostReliable.carrier.rating}/5 rating with ${mostReliable.carrier.completedShipments}+ completed shipments.`,
      routeId: mostReliable.id,
      confidence: 0.90
    });
  }

  // 4. Route Optimization Insights
  const topOption = routeData.routeOptions[0];
  if (topOption) {
    const capacityUtilization = Math.round(
      (routeData.shipment.pallets / MOCK_CARRIERS.find(c => c.id === topOption.carrier.id).capacity.pallets) * 100
    );
    
    recommendations.push({
      type: 'optimization_insight',
      title: 'Capacity Optimization',
      description: `This shipment will utilize approximately ${capacityUtilization}% of the carrier's pallet capacity. ${capacityUtilization < 60 ? 'Consider consolidating with another shipment to maximize efficiency.' : 'Good capacity utilization for this route.'}`,
      routeId: topOption.id,
      confidence: 0.85
    });
  }

  // If OpenAI is configured, enhance with AI analysis
  if (openaiApiKey) {
    try {
      const aiAnalysis = await getAIRouteAnalysis(routeData, recommendations, openaiApiKey);
      recommendations.push(...aiAnalysis);
    } catch (error) {
      console.warn('AI analysis failed, using algorithmic recommendations only:', error.message);
    }
  }

  return recommendations;
}

/**
 * Get AI-powered route analysis from OpenAI
 */
async function getAIRouteAnalysis(routeData, existingRecommendations, apiKey) {
  const prompt = `As a logistics routing expert, analyze this shipment routing data and provide 1-2 additional strategic insights:

Shipment: ${routeData.shipment.pallets} pallets, ${routeData.shipment.weightKg}kg from ${routeData.shipment.pickupLocation.city} to ${routeData.shipment.deliveryLocation.city}

Top Carrier Options:
${routeData.routeOptions.slice(0, 3).map((r, i) => 
  `${i + 1}. ${r.carrier.name} (Rating: ${r.carrier.rating}, Price: €${r.pricing.estimatedPrice}, Match Score: ${r.matchScore.total}%)`
).join('\n')}

Provide insights on: route efficiency, seasonal considerations, or risk mitigation. Return JSON array with objects containing: type, title, description, confidence (0-1).`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a logistics routing expert. Provide concise, actionable insights in JSON format only. Maximum 2 insights.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 400
      })
    });

    if (!response.ok) return [];

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return [];

    try {
      const insights = JSON.parse(content);
      return Array.isArray(insights) ? insights : [];
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

// ============================================================================
// Route Evaluation and Scoring
// ============================================================================

/**
 * Evaluate a specific route in detail
 */
function evaluateRoute(routeId, routeOptions) {
  const route = routeOptions.find(r => r.id === routeId);
  if (!route) return null;

  const evaluation = {
    routeId,
    overallScore: route.matchScore.total,
    grade: calculateGrade(route.matchScore.total),
    detailedScores: route.matchScore.breakdown,
    riskAssessment: assessRouteRisks(route),
    efficiency: calculateEfficiencyMetrics(route),
    recommendations: generateRouteSpecificRecommendations(route)
  };

  return evaluation;
}

/**
 * Calculate grade based on score
 */
function calculateGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  return 'C';
}

/**
 * Assess route risks
 */
function assessRouteRisks(route) {
  const risks = [];

  if (route.route.pickupDistance > 200) {
    risks.push({
      type: 'high_pickup_distance',
      severity: 'medium',
      description: `Carrier is ${route.route.pickupDistance}km from pickup location`,
      mitigation: 'Consider allowing extra time for pickup or selecting a closer carrier'
    });
  }

  if (route.carrier.rating < 4.5) {
    risks.push({
      type: 'lower_rating',
      severity: 'low',
      description: `Carrier rating is ${route.carrier.rating}/5`,
      mitigation: 'Monitor shipment closely and maintain direct communication'
    });
  }

  if (route.matchScore.breakdown.capacity < 80) {
    risks.push({
      type: 'capacity_constraint',
      severity: 'medium',
      description: 'Shipment uses significant portion of carrier capacity',
      mitigation: 'Verify exact dimensions and confirm capacity availability'
    });
  }

  return {
    riskLevel: risks.length === 0 ? 'low' : risks.length <= 2 ? 'medium' : 'high',
    riskCount: risks.length,
    risks
  };
}

/**
 * Calculate efficiency metrics
 */
function calculateEfficiencyMetrics(route) {
  const distanceEfficiency = route.route.distance / route.route.totalDistance;
  
  return {
    directRouteRatio: Math.round(distanceEfficiency * 100) / 100,
    emptyMilesPercentage: Math.round((1 - distanceEfficiency) * 100),
    fuelEfficiencyScore: Math.round(distanceEfficiency * 100),
    co2EstimateKg: Math.round(route.route.totalDistance * 0.12) // ~120g CO2 per km for truck
  };
}

/**
 * Generate route-specific recommendations
 */
function generateRouteSpecificRecommendations(route) {
  const recommendations = [];

  if (route.matchScore.breakdown.proximity < 60) {
    recommendations.push('Consider a carrier closer to the pickup location for faster response time');
  }

  if (route.pricing.estimatedPrice > routeData?.routeOptions?.[0]?.pricing?.estimatedPrice * 1.2) {
    recommendations.push('This option is 20%+ more expensive than the best value alternative');
  }

  if (route.vehicle.recommendedType !== route.vehicle.availableTypes[0]) {
    recommendations.push(`Consider requesting a ${route.vehicle.recommendedType} for optimal capacity utilization`);
  }

  return recommendations;
}

// ============================================================================
// Carrier Matching API
// ============================================================================

/**
 * Find matching carriers for a shipment
 */
function findMatchingCarriers(shipment, options = {}) {
  const { 
    minRating = 4.0, 
    maxDistance = 500,
    requiredAvailability = 'available'
  } = options;

  const matches = MOCK_CARRIERS
    .filter(carrier => {
      // Basic filters
      if (carrier.rating < minRating) return false;
      if (requiredAvailability && carrier.availability !== requiredAvailability) return false;
      
      // Capacity check
      if (shipment.pallets > carrier.capacity.pallets) return false;
      if (shipment.weightKg > carrier.capacity.weightKg) return false;
      
      // Geographic coverage
      const canPickup = carrier.operatingCountries.includes(shipment.pickupLocation.country);
      const canDeliver = carrier.operatingCountries.includes(shipment.deliveryLocation.country);
      if (!canPickup || !canDeliver) return false;
      
      // Distance check
      const pickupDistance = calculateCarrierPickupDistance(carrier, shipment.pickupLocation);
      if (pickupDistance > maxDistance) return false;
      
      return true;
    })
    .map(carrier => {
      const routeDistance = calculateHaversineDistance(
        shipment.pickupLocation.lat,
        shipment.pickupLocation.lng,
        shipment.deliveryLocation.lat,
        shipment.deliveryLocation.lng
      );
      
      const score = scoreCarrierMatch(carrier, shipment, routeDistance);
      
      return {
        carrier: {
          id: carrier.id,
          name: carrier.name,
          rating: carrier.rating,
          location: carrier.location,
          vehicleTypes: carrier.vehicleTypes,
          availability: carrier.availability
        },
        matchScore: score.total,
        estimatedPrice: score.estimatedPrice,
        pickupDistance: score.pickupDistance
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  return {
    matches,
    totalAvailable: matches.length,
    filters: options,
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// Export Module Functions
// ============================================================================

module.exports = {
  // Core routing functions
  optimizeRoutes,
  evaluateRoute,
  findMatchingCarriers,
  generateRecommendations,
  
  // Utility functions
  calculateHaversineDistance,
  scoreCarrierMatch,
  calculateEstimatedPrice,
  selectVehicleType,
  
  // Data
  MOCK_CARRIERS
};
