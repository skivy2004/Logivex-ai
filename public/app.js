// Keep some state for Google Places selections so we can optionally
// send coordinates along with the formatted address.
let logivexPickupPlace = null;
let logivexDropoffPlace = null;

// Mirror of the server-side pricing configuration so that
// the frontend can show a live price estimate.
const LOGIVEX_PRICING = {
  startFee: 25,
  pricePerKm: 0.9,
  vehicleFactor: {
    van: 1.0,
    'box truck': 1.3,
    trailer: 1.6,
    other: 1.2
  }
};

function calculateTransportPriceClient(distanceKm, vehicleType) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm < 0) {
    return null;
  }
  const normalizedType = (vehicleType || '').toString().toLowerCase();
  const factor = LOGIVEX_PRICING.vehicleFactor[normalizedType] || 1;
  const price = (LOGIVEX_PRICING.startFee + distanceKm * LOGIVEX_PRICING.pricePerKm) * factor;
  return Number(price.toFixed(2));
}

// Simple in-browser translations for EN, NL, DE.
// Keys correspond to data-i18n / data-i18n-placeholder attributes in index.html.
const LOGIVEX_TRANSLATIONS = {
  en: {
    'nav.how': 'How it works',
    'nav.why': 'Why Logivex',
    'nav.cta': 'Get My Quote',
    'hero.kicker': 'Transport quotation platform',
    'hero.title': 'Get an Instant Transport Quote',
    'hero.subtitle':
      'Enter your shipment details and receive a fast and reliable transport quote. Built for modern logistics and freight teams.',
    'hero.button': 'Get My Quote',
    'form.title': 'Request a transport quote',
    'form.subtitle':
      'Share your route, shipment details and contact information. We will send your quote by email.',
    'form.pickupLabel': 'Pickup address',
    'form.pickupPlaceholder': 'e.g. Warehouse A, Berlin',
    'form.dropoffLabel': 'Drop-off address',
    'form.dropoffPlaceholder': 'e.g. Distribution Center, Hamburg',
    'form.shipmentSection': 'Shipment details',
    'form.weightLabel': 'Total weight (kg)',
    'form.colliLabel': 'Number of colli',
    'form.cargoLabel': 'Cargo type',
    'form.cargoPlaceholder': 'Select cargo type',
    'form.cargoPallet': 'Pallet',
    'form.cargoBox': 'Box',
    'form.cargoOther': 'Other',
    'form.dateLabel': 'Pickup date',
    'form.vehicleLabel': 'Vehicle type',
    'form.vehiclePlaceholder': 'Select vehicle',
    'form.vehicleVan': 'Van',
    'form.vehicleBox': 'Box truck',
    'form.vehicleTrailer': 'Trailer',
    'form.vehicleOther': 'Other',
    'form.nameLabel': 'Your name',
    'form.emailLabel': 'Email address',
    'form.notesLabel': 'Notes / special instructions (optional)',
    'form.submit': 'Send quote request',
    'how.title': 'How it works',
    'how.subtitle': 'From shipment details to scheduled transport in three clear steps.',
    'how.step1Title': 'Step 1 — Enter shipment details',
    'how.step1Text':
      'Share your route, cargo type and timing so we understand your transport needs.',
    'how.step2Title': 'Step 2 — Receive your quote',
    'how.step2Text':
      'We calculate a tailored transport quote and send it directly to your inbox.',
    'how.step3Title': 'Step 3 — Confirm transport',
    'how.step3Text':
      'Approve the quote and we coordinate reliable transport with trusted carriers.',
    'trust.title': 'Why logistics teams choose Logivex',
    'trust.fastTitle': 'Fast response',
    'trust.fastText': 'Quotes generated quickly so you can keep your operations moving.',
    'trust.reliableTitle': 'Reliable transport',
    'trust.reliableText':
      'Routes and partners focused on on-time performance and cargo safety.',
    'trust.transparentTitle': 'Transparent pricing',
    'trust.transparentText':
      'Clear, easy-to-understand quotes with no hidden fees or surprises.'
  },
  nl: {
    'nav.how': 'Hoe het werkt',
    'nav.why': 'Waarom Logivex',
    'nav.cta': 'Vraag mijn offerte aan',
    'hero.kicker': 'Transport offerte platform',
    'hero.title': 'Ontvang direct een transportofferte',
    'hero.subtitle':
      'Vul uw zending in en ontvang snel een betrouwbare transportofferte. Gemaakt voor moderne logistieke teams.',
    'hero.button': 'Vraag mijn offerte aan',
    'form.title': 'Vraag een transportofferte aan',
    'form.subtitle':
      'Deel uw route, zending en contactgegevens. Wij sturen de offerte per e-mail.',
    'form.pickupLabel': 'Ophaaladres',
    'form.pickupPlaceholder': 'bijv. Magazijn A, Amsterdam',
    'form.dropoffLabel': 'Afleveradres',
    'form.dropoffPlaceholder': 'bijv. Distributiecentrum, Rotterdam',
    'form.shipmentSection': 'Zending',
    'form.weightLabel': 'Totaal gewicht (kg)',
    'form.colliLabel': 'Aantal colli',
    'form.cargoLabel': 'Ladingtype',
    'form.cargoPlaceholder': 'Kies ladingtype',
    'form.cargoPallet': 'Pallet',
    'form.cargoBox': 'Doos',
    'form.cargoOther': 'Overig',
    'form.dateLabel': 'Ophaaldatum',
    'form.vehicleLabel': 'Voertuigtype',
    'form.vehiclePlaceholder': 'Kies voertuig',
    'form.vehicleVan': 'Bus',
    'form.vehicleBox': 'Bakwagen',
    'form.vehicleTrailer': 'Trailer',
    'form.vehicleOther': 'Overig',
    'form.nameLabel': 'Uw naam',
    'form.emailLabel': 'E-mailadres',
    'form.notesLabel': 'Opmerkingen / instructies (optioneel)',
    'form.submit': 'Verstuur offerteaanvraag',
    'how.title': 'Hoe het werkt',
    'how.subtitle': 'In drie duidelijke stappen van aanvraag naar transport.',
    'how.step1Title': 'Stap 1 — Vul uw zending in',
    'how.step1Text': 'Geef route, lading en planning door zodat wij de aanvraag begrijpen.',
    'how.step2Title': 'Stap 2 — Ontvang uw offerte',
    'how.step2Text':
      'Wij berekenen een passende prijs en sturen de offerte direct naar uw inbox.',
    'how.step3Title': 'Stap 3 — Bevestig het transport',
    'how.step3Text':
      'Keurt u de offerte goed, dan plannen wij het transport met betrouwbare vervoerders.',
    'trust.title': 'Waarom logistieke teams voor Logivex kiezen',
    'trust.fastTitle': 'Snelle reactie',
    'trust.fastText': 'Offertes snel beschikbaar zodat uw operatie kan doorlopen.',
    'trust.reliableTitle': 'Betrouwbaar transport',
    'trust.reliableText':
      'Routes en partners gericht op stiptheid en veiligheid van uw lading.',
    'trust.transparentTitle': 'Transparante prijzen',
    'trust.transparentText':
      'Duidelijke tarieven zonder verborgen kosten of verrassingen achteraf.'
  },
  de: {
    'nav.how': 'So funktioniert es',
    'nav.why': 'Warum Logivex',
    'nav.cta': 'Angebot anfordern',
    'hero.kicker': 'Plattform für Transportangebote',
    'hero.title': 'Erhalten Sie sofort ein Transportangebot',
    'hero.subtitle':
      'Geben Sie Ihre Sendungsdaten ein und erhalten Sie schnell ein zuverlässiges Transportangebot. Entwickelt für moderne Logistikteams.',
    'hero.button': 'Angebot anfordern',
    'form.title': 'Transportangebot anfordern',
    'form.subtitle':
      'Teilen Sie Route, Sendungsdaten und Kontaktdaten. Wir senden Ihnen das Angebot per E-Mail.',
    'form.pickupLabel': 'Abholadresse',
    'form.pickupPlaceholder': 'z. B. Lager A, Berlin',
    'form.dropoffLabel': 'Zustelladresse',
    'form.dropoffPlaceholder': 'z. B. Verteilzentrum, Hamburg',
    'form.shipmentSection': 'Sendungsdetails',
    'form.weightLabel': 'Gesamtgewicht (kg)',
    'form.colliLabel': 'Anzahl Kolli',
    'form.cargoLabel': 'Ladungsart',
    'form.cargoPlaceholder': 'Ladungsart wählen',
    'form.cargoPallet': 'Palette',
    'form.cargoBox': 'Karton',
    'form.cargoOther': 'Sonstiges',
    'form.dateLabel': 'Abholdatum',
    'form.vehicleLabel': 'Fahrzeugtyp',
    'form.vehiclePlaceholder': 'Fahrzeug wählen',
    'form.vehicleVan': 'Transporter',
    'form.vehicleBox': 'Koffer-Lkw',
    'form.vehicleTrailer': 'Trailer',
    'form.vehicleOther': 'Sonstiges',
    'form.nameLabel': 'Ihr Name',
    'form.emailLabel': 'E-Mail-Adresse',
    'form.notesLabel': 'Hinweise / besondere Anweisungen (optional)',
    'form.submit': 'Anfrage senden',
    'how.title': 'So funktioniert es',
    'how.subtitle': 'In drei klaren Schritten von der Anfrage zum Transport.',
    'how.step1Title': 'Schritt 1 — Sendungsdaten eingeben',
    'how.step1Text': 'Teilen Sie Route, Ladung und Zeitfenster, damit wir Ihren Bedarf verstehen.',
    'how.step2Title': 'Schritt 2 — Angebot erhalten',
    'how.step2Text':
      'Wir berechnen einen passenden Preis und senden das Angebot direkt in Ihr Postfach.',
    'how.step3Title': 'Schritt 3 — Transport bestätigen',
    'how.step3Text':
      'Nach Freigabe des Angebots planen wir den Transport mit zuverlässigen Frachtführern.',
    'trust.title': 'Warum Logistikteams Logivex wählen',
    'trust.fastTitle': 'Schnelle Rückmeldung',
    'trust.fastText':
      'Angebote sind schnell verfügbar, damit Ihre Operation ohne Unterbrechung läuft.',
    'trust.reliableTitle': 'Zuverlässiger Transport',
    'trust.reliableText':
      'Routen und Partner mit Fokus auf Pünktlichkeit und Sicherheit der Ladung.',
    'trust.transparentTitle': 'Transparente Preise',
    'trust.transparentText':
      'Klare, leicht verständliche Angebote ohne versteckte Kosten oder Überraschungen.'
  }
};

// Allowed ISO country codes for European transports.
const LOGIVEX_EU_COUNTRIES = [
  'NL',
  'DE',
  'BE',
  'FR',
  'ES',
  'IT',
  'PL',
  'AT',
  'CH',
  'CZ',
  'SK',
  'DK',
  'SE',
  'NO',
  'FI',
  'PT',
  'HU',
  'RO',
  'BG',
  'HR',
  'SI',
  'EE',
  'LV',
  'LT',
  'LU',
  'IE'
];

let logivexLastDistanceKm = null;

document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll fallback for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  console.log('DOM loaded, initializing...');
  
  const form = document.getElementById('quote-form');
  const messageEl = document.getElementById('form-message');
  const submitButton = document.getElementById('submit-button');
  const pickupInput = document.getElementById('pickupAddress');
  const dropoffInput = document.getElementById('dropoffAddress');
  const languageSelect = document.getElementById('language-select');

  // Load Google Maps API key from backend
  console.log('Calling loadGoogleMaps...');
  loadGoogleMaps();

  function setMessage(text, type) {
    messageEl.textContent = text;
    messageEl.classList.remove('form-message--success', 'form-message--error');
    if (type === 'success') {
      messageEl.classList.add('form-message--success');
    } else if (type === 'error') {
      messageEl.classList.add('form-message--error');
    }
  }

  // If the user manually edits an address after choosing a suggestion,
  // clear the stored place data so we don't send stale coordinates.
  if (pickupInput) {
    pickupInput.addEventListener('input', () => {
      logivexPickupPlace = null;
    });
  }
  if (dropoffInput) {
    dropoffInput.addEventListener('input', () => {
      logivexDropoffPlace = null;
      clearFieldError(dropoffInput);
    });
  }

  // Language selection handling
  if (languageSelect) {
    const stored = window.localStorage.getItem('logivex_lang');
    const browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
    const initial =
      stored && LOGIVEX_TRANSLATIONS[stored]
        ? stored
        : LOGIVEX_TRANSLATIONS[browserLang]
        ? browserLang
        : 'en';

    languageSelect.value = initial;
    applyLanguage(initial);

    languageSelect.addEventListener('change', () => {
      const lang = languageSelect.value;
      applyLanguage(lang);
      window.localStorage.setItem('logivex_lang', lang);
    });
  } else {
    // Fallback: ensure at least <html lang> is set.
    document.documentElement.lang = 'en';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('', null);

    const formData = new FormData(form);
    const pickupAddress = formData.get('pickupAddress')?.toString().trim();
    const dropoffAddress = formData.get('dropoffAddress')?.toString().trim();

    const vehicleType = formData.get('vehicleType');

    const payload = {
      pickupAddress,
      dropoffAddress,
      date: formData.get('date'),
      vehicleType,
      weightKg: formData.get('weightKg')?.toString().trim(),
      colli: formData.get('colli')?.toString().trim(),
      cargoType: formData.get('cargoType')?.toString().trim(),
      customerName: formData.get('customerName')?.toString().trim(),
      customerEmail: formData.get('customerEmail')?.toString().trim(),
      notes: formData.get('notes')?.toString().trim(),
      pickupLat: logivexPickupPlace?.lat ?? null,
      pickupLng: logivexPickupPlace?.lng ?? null,
      dropoffLat: logivexDropoffPlace?.lat ?? null,
      dropoffLng: logivexDropoffPlace?.lng ?? null,
      distanceKm: null,
      calculatedPrice: null
    };

    clearFieldError(pickupInput);
    clearFieldError(dropoffInput);

    if (!payload.pickupAddress || !payload.dropoffAddress) {
      setMessage('Please fill in all required fields.', 'error');
      if (!payload.pickupAddress) setFieldError(pickupInput);
      if (!payload.dropoffAddress) setFieldError(dropoffInput);
      return;
    }

    // Enforce that both addresses come from a valid Google place with
    // house number and are inside Europe.
    if (!validateAddressPlace(logivexPickupPlace, pickupInput)) {
      return;
    }
    if (!validateAddressPlace(logivexDropoffPlace, dropoffInput)) {
      return;
    }

    if (!payload.date || !payload.vehicleType || !payload.customerName || !payload.customerEmail) {
      setMessage('Please fill in all required fields.', 'error');
      return;
    }

    // Try to calculate distance and price before submitting, if the
    // Google Maps Distance Matrix API is available. If it fails, we
    // still submit the request without those fields.
    try {
      if (logivexLastDistanceKm == null) {
        logivexLastDistanceKm = await calculateDistance(pickupAddress, dropoffAddress);
      }
      if (typeof logivexLastDistanceKm === 'number') {
        payload.distanceKm = logivexLastDistanceKm;
        const price = calculateTransportPriceClient(logivexLastDistanceKm, vehicleType);
        if (price != null) {
          payload.calculatedPrice = price;
        }
      }
    } catch (err) {
      console.warn('Unable to calculate distance/price automatically:', err);
    }

    submitButton.disabled = true;
    submitButton.classList.add('loading');

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        setMessage(
          data.message || 'Quote submitted successfully. You will receive an email shortly.',
          'success'
        );
        form.reset();
        logivexPickupPlace = null;
        logivexDropoffPlace = null;
      } else {
        setMessage(
          data.message || 'There was a problem sending your quote. Please try again, or contact us directly.',
          'error'
        );
      }
    } catch (error) {
      console.error('Error submitting quote:', error);
      setMessage('Network error. Please check your connection and try again.', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.classList.remove('loading');
    }
  }

  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
});

// Called after Google Maps script loads successfully.
// Sets up Places Autocomplete on pickup and drop-off address fields.
function initLogivexMaps() {
  console.log('Initializing Google Maps autocomplete...');
  
  if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
    console.error('Google Maps Places library not available.');
    return;
  }

  const pickupInput = document.getElementById('pickupAddress');
  const dropoffInput = document.getElementById('dropoffAddress');

  if (!pickupInput || !dropoffInput) {
    console.error('Pickup or dropoff input fields not found');
    return;
  }
  
  console.log('Found pickup and dropoff inputs, attaching autocomplete...');

  const options = {
    fields: ['formatted_address', 'geometry', 'place_id', 'address_components'],
    types: ['geocode'],
    componentRestrictions: {
      country: LOGIVEX_EU_COUNTRIES.map(c => c.toLowerCase())
    }
  };

  try {
    const pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput, options);
    console.log('✓ Pickup autocomplete attached');
    
    const dropoffAutocomplete = new google.maps.places.Autocomplete(dropoffInput, options);
    console.log('✓ Dropoff autocomplete attached');

    pickupAutocomplete.addListener('place_changed', () => {
      console.log('Pickup address selected from autocomplete');
      const place = pickupAutocomplete.getPlace();
      if (!place) return;

      clearFieldError(pickupInput);

      if (place.formatted_address) {
        pickupInput.value = place.formatted_address;
      }

      const parsed = parsePlace(place, pickupInput.value);
      logivexPickupPlace = parsed;

      if (!validateAddressPlace(logivexPickupPlace, pickupInput)) {
        logivexPickupPlace = null;
        return;
      }

      refreshDistanceAndPrice();
    });

    dropoffAutocomplete.addListener('place_changed', () => {
      console.log('Dropoff address selected from autocomplete');
      const place = dropoffAutocomplete.getPlace();
      if (!place) return;

      clearFieldError(dropoffInput);

      if (place.formatted_address) {
        dropoffInput.value = place.formatted_address;
      }

      const parsed = parsePlace(place, dropoffInput.value);
      logivexDropoffPlace = parsed;

      if (!validateAddressPlace(logivexDropoffPlace, dropoffInput)) {
        logivexDropoffPlace = null;
        return;
      }

      refreshDistanceAndPrice();
    });
    
    console.log('✓ Google Places Autocomplete initialized successfully');
  } catch (error) {
    console.error('Error initializing Google Places Autocomplete:', error);
  }
}

// Helper: use Google Distance Matrix to calculate distance in km
// between the pickup and drop-off addresses.
function calculateDistance(pickupAddress, dropoffAddress) {
  return new Promise((resolve) => {
    if (
      !pickupAddress ||
      !dropoffAddress ||
      typeof google === 'undefined' ||
      !google.maps ||
      !google.maps.DistanceMatrixService
    ) {
      resolve(null);
      return;
    }

    const service = new google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
      {
        origins: [pickupAddress],
        destinations: [dropoffAddress],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC
      },
      (response, status) => {
        if (status !== 'OK' || !response || !response.rows || !response.rows[0]) {
          console.warn('Distance Matrix error:', status, response);
          resolve(null);
          return;
        }

        const element = response.rows[0].elements[0];
        if (!element || element.status !== 'OK') {
          console.warn('Distance Matrix element error:', element && element.status);
          resolve(null);
          return;
        }

        const meters =
          element.distance && typeof element.distance.value === 'number'
            ? element.distance.value
            : null;

        if (meters == null) {
          resolve(null);
          return;
        }

        resolve(meters / 1000);
      }
    );
  });
}

// Parse a Google PlaceResult into a compact object we can use
// for validation and payloads.
function parsePlace(place, fallbackAddress) {
  const location = place.geometry && place.geometry.location;
  const addressComponents = place.address_components || [];

  let street = '';
  let houseNumber = '';
  let countryCode = '';

  addressComponents.forEach(component => {
    if (!component.types || !component.types.length) return;
    if (component.types.includes('route')) {
      street = component.long_name || street;
    }
    if (component.types.includes('street_number')) {
      houseNumber = component.long_name || houseNumber;
    }
    if (component.types.includes('country')) {
      countryCode = component.short_name || countryCode;
    }
  });

  return location
    ? {
        formattedAddress: place.formatted_address || fallbackAddress,
        lat: location.lat(),
        lng: location.lng(),
        placeId: place.place_id || null,
        street,
        houseNumber,
        countryCode
      }
    : null;
}

function validateAddressPlace(parsedPlace, inputEl) {
  if (!parsedPlace) {
    setMessage('Please select an address from the suggestions.', 'error');
    if (inputEl) setFieldError(inputEl);
    return false;
  }

  if (!validateHouseNumber(parsedPlace)) {
    setMessage('Please select a full address including a house number.', 'error');
    if (inputEl) setFieldError(inputEl);
    return false;
  }

  if (!validateEuropeanAddress(parsedPlace)) {
    setMessage('Only European transport routes are supported.', 'error');
    if (inputEl) setFieldError(inputEl);
    return false;
  }

  return true;
}

function validateHouseNumber(parsedPlace) {
  return Boolean(parsedPlace && parsedPlace.houseNumber);
}

function validateEuropeanAddress(parsedPlace) {
  if (!parsedPlace || !parsedPlace.countryCode) return false;
  return LOGIVEX_EU_COUNTRIES.includes(parsedPlace.countryCode.toUpperCase());
}

function setFieldError(inputEl) {
  if (!inputEl) return;
  const field = inputEl.closest('.field');
  if (field) {
    field.classList.add('field-error');
  }
}

function clearFieldError(inputEl) {
  if (!inputEl) return;
  const field = inputEl.closest('.field');
  if (field) {
    field.classList.remove('field-error');
  }
}

// Refresh distance and live price when both addresses are valid.
async function refreshDistanceAndPrice() {
  const pickupAddress = logivexPickupPlace?.formattedAddress;
  const dropoffAddress = logivexDropoffPlace?.formattedAddress;
  const vehicleTypeSelect = document.getElementById('vehicleType');
  const vehicleType = vehicleTypeSelect ? vehicleTypeSelect.value : null;

  if (!pickupAddress || !dropoffAddress) {
    return;
  }

  try {
    const distanceKm = await calculateDistance(pickupAddress, dropoffAddress);
    if (typeof distanceKm === 'number') {
      logivexLastDistanceKm = distanceKm;
      updateDistanceDisplay(distanceKm);
      updatePriceEstimate(distanceKm, vehicleType);
      updateQuoteSummary();
    }
  } catch (err) {
    console.warn('Distance calculation failed:', err);
  }
}

function updateDistanceDisplay(distanceKm) {
  const el = document.getElementById('distance-display');
  const summaryDistance = document.getElementById('summary-distance');
  if (!el && !summaryDistance) return;

  const rounded = Math.round(distanceKm);
  const label = isFinite(rounded) ? `${rounded} km` : '–';

  if (el) {
    el.textContent = label !== '–' ? `Distance: ${label}` : '';
  }
  if (summaryDistance) {
    summaryDistance.textContent = label;
  }
}

function updatePriceEstimate(distanceKm, vehicleType) {
  const priceEl = document.getElementById('price-estimate');
  const summaryPriceEl = document.getElementById('summary-price');
  if (!priceEl && !summaryPriceEl) return;

  if (!vehicleType || typeof distanceKm !== 'number') {
    if (priceEl) priceEl.textContent = '–';
    if (summaryPriceEl) summaryPriceEl.textContent = '–';
    return;
  }

  const price = calculateTransportPriceClient(distanceKm, vehicleType);
  const formatted = price != null ? `€${price.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '–';

  if (priceEl) priceEl.textContent = formatted;
  if (summaryPriceEl) summaryPriceEl.textContent = formatted;
}

function updateQuoteSummary() {
  const routeEl = document.getElementById('summary-route');
  const vehicleEl = document.getElementById('summary-vehicle');
  const weightEl = document.getElementById('summary-weight');

  if (routeEl) {
    const from = logivexPickupPlace?.formattedAddress || '–';
    const to = logivexDropoffPlace?.formattedAddress || '–';
    routeEl.textContent = from !== '–' && to !== '–' ? `${from} → ${to}` : '–';
  }

  if (vehicleEl) {
    const vehicleTypeSelect = document.getElementById('vehicleType');
    const vehicle =
      vehicleTypeSelect && vehicleTypeSelect.options[vehicleTypeSelect.selectedIndex]
        ? vehicleTypeSelect.options[vehicleTypeSelect.selectedIndex].textContent
        : '–';
    vehicleEl.textContent = vehicle || '–';
  }

  if (weightEl) {
    const weightInput = document.getElementById('weightKg');
    const colliInput = document.getElementById('colli');
    const weight = weightInput && weightInput.value ? `${weightInput.value} kg` : null;
    const colli = colliInput && colliInput.value ? `${colliInput.value} colli` : null;

    if (weight && colli) {
      weightEl.textContent = `${weight} • ${colli}`;
    } else if (weight || colli) {
      weightEl.textContent = weight || colli;
    } else {
      weightEl.textContent = '–';
    }
  }
}

// Load Google Maps API key from backend and initialize the script
async function loadGoogleMaps() {
  console.log('loadGoogleMaps() started');
  
  const pickupInput = document.getElementById('pickupAddress');
  const dropoffInput = document.getElementById('dropoffAddress');
  
  // Show loading state
  if (pickupInput) pickupInput.placeholder = 'Loading address autocomplete...';
  if (dropoffInput) dropoffInput.placeholder = 'Loading address autocomplete...';
  
  try {
    console.log('Fetching /api/config...');
    const response = await fetch('/api/config');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Config received:', data);
    
    const apiKey = data.googleMapsApiKey;
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured on server');
      if (pickupInput) pickupInput.placeholder = 'Enter address manually';
      if (dropoffInput) dropoffInput.placeholder = 'Enter address manually';
      return;
    }
    
    console.log('API key found, creating script...');
    
    // Create script element dynamically
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    
    script.onload = () => {
      console.log('Google Maps script loaded successfully');
      initLogivexMaps();
      
      // Restore original placeholders
      if (pickupInput) pickupInput.placeholder = pickupInput.getAttribute('data-i18n-placeholder') || 'e.g. Warehouse A, Berlin';
      if (dropoffInput) dropoffInput.placeholder = dropoffInput.getAttribute('data-i18n-placeholder') || 'e.g. Distribution Center, Hamburg';
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Maps API script');
      if (pickupInput) pickupInput.placeholder = 'Enter address manually';
      if (dropoffInput) dropoffInput.placeholder = 'Enter address manually';
    };
    
    document.head.appendChild(script);
    console.log('Script appended to head, src:', script.src);
    
  } catch (error) {
    console.error('Error in loadGoogleMaps:', error);
    
    if (pickupInput) pickupInput.placeholder = 'Enter address manually';
    if (dropoffInput) dropoffInput.placeholder = 'Enter address manually';
  }
}

// Apply translations based on data-i18n attributes.
function applyLanguage(lang) {
  const dict = LOGIVEX_TRANSLATIONS[lang] || LOGIVEX_TRANSLATIONS.en;
  document.documentElement.lang = lang;

  const textNodes = document.querySelectorAll('[data-i18n]');
  textNodes.forEach(node => {
    const key = node.getAttribute('data-i18n');
    if (key && dict[key]) {
      node.textContent = dict[key];
    }
  });

  const placeholderNodes = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderNodes.forEach(node => {
    const key = node.getAttribute('data-i18n-placeholder');
    if (key && dict[key] && 'placeholder' in node) {
      node.placeholder = dict[key];
    }
  });
}

