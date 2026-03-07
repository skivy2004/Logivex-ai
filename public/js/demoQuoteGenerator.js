/**
 * Admin demo quote generator – European routes and realistic cargo.
 * Used on the quote-demo page when the user is logged in as admin.
 */
(function (global) {
  'use strict';

  const europeanCities = [
    { city: 'Rotterdam', country: 'Netherlands' },
    { city: 'Amsterdam', country: 'Netherlands' },
    { city: 'Antwerp', country: 'Belgium' },
    { city: 'Brussels', country: 'Belgium' },
    { city: 'Hamburg', country: 'Germany' },
    { city: 'Cologne', country: 'Germany' },
    { city: 'Frankfurt', country: 'Germany' },
    { city: 'Berlin', country: 'Germany' },
    { city: 'Munich', country: 'Germany' },
    { city: 'Paris', country: 'France' },
    { city: 'Lyon', country: 'France' },
    { city: 'Barcelona', country: 'Spain' },
    { city: 'Madrid', country: 'Spain' },
    { city: 'Milan', country: 'Italy' },
    { city: 'Rome', country: 'Italy' },
    { city: 'Vienna', country: 'Austria' },
    { city: 'Prague', country: 'Czech Republic' },
    { city: 'Warsaw', country: 'Poland' },
    { city: 'Copenhagen', country: 'Denmark' },
    { city: 'Düsseldorf', country: 'Germany' },
    { city: 'Leipzig', country: 'Germany' }
  ];

  const DEMO_NOTES = [
    'Handle with care – fragile shipment',
    'Loading dock available. Prefer morning pickup.',
    'Palletized goods. Standard EUR pallets.',
    'Time window: 08:00–12:00 preferred.',
    'Contact on arrival. Fragile – no stacking.'
  ];

  function getRandomEuropeanCity() {
    const i = Math.floor(Math.random() * europeanCities.length);
    return europeanCities[i];
  }

  /**
   * Pick two different European cities for pickup and dropoff.
   * Returns { pickup: string, dropoff: string } (e.g. "Rotterdam, Netherlands").
   */
  function getRandomEuropeanRoute() {
    const a = getRandomEuropeanCity();
    let b = getRandomEuropeanCity();
    while (b.city === a.city && b.country === a.country) {
      b = getRandomEuropeanCity();
    }
    return {
      pickup: a.city + ', ' + a.country,
      dropoff: b.city + ', ' + b.country
    };
  }

  /**
   * Returns array of cargo items: { type: 'pallets'|'boxes'|'other', quantity: number }.
   * Realistic combinations: 2 pallets, 3 pallets, 4 boxes, 1 pallet + 2 boxes, 3 pallets + fragile, etc.
   */
  function getRandomCargo() {
    const presets = [
      [{ type: 'pallets', quantity: 2 }],
      [{ type: 'pallets', quantity: 3 }],
      [{ type: 'boxes', quantity: 4 }],
      [{ type: 'pallets', quantity: 1 }, { type: 'boxes', quantity: 2 }],
      [{ type: 'pallets', quantity: 3 }, { type: 'boxes', quantity: 1 }],
      [{ type: 'pallets', quantity: 2 }, { type: 'boxes', quantity: 2 }],
      [{ type: 'pallets', quantity: 4 }],
      [{ type: 'boxes', quantity: 6 }]
    ];
    const i = Math.floor(Math.random() * presets.length);
    return presets[i];
  }

  /**
   * Date 1–4 days from today in YYYY-MM-DD format for input[type="date"].
   */
  function getRandomDate() {
    const daysFromNow = 1 + Math.floor(Math.random() * 4);
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  /**
   * Generate a full demo quote payload (no email – use logged-in user email on the page).
   * Returns { pickupAddress, dropoffAddress, date, cargoItems, notes }.
   */
  function generateDemoQuote() {
    const route = getRandomEuropeanRoute();
    const cargoItems = getRandomCargo();
    const notesIndex = Math.floor(Math.random() * DEMO_NOTES.length);
    return {
      pickupAddress: route.pickup,
      dropoffAddress: route.dropoff,
      date: getRandomDate(),
      cargoItems: cargoItems,
      notes: DEMO_NOTES[notesIndex]
    };
  }

  global.getRandomEuropeanCity = getRandomEuropeanCity;
  global.getRandomEuropeanRoute = getRandomEuropeanRoute;
  global.getRandomCargo = getRandomCargo;
  global.getRandomDate = getRandomDate;
  global.generateDemoQuote = generateDemoQuote;
})(typeof window !== 'undefined' ? window : this);
