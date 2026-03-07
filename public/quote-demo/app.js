// Keep some state for Google Places selections so we can optionally
// send coordinates along with the formatted address.
let logivexPickupPlace = null;
let logivexDropoffPlace = null;

// Mirror of the server-side pricing configuration so that
// the frontend can show a live price estimate.
const LOGIVEX_PRICING = {
  startFee: 25,
  pricePerKm: 0.9,
  pricePerCargoUnit: 0.5  // Price per pallet/box/unit
};

// Cargo management state
let cargoRowCounter = 1; // Start at 1 since we have a default row at index 0

function calculateTransportPriceClient(distanceKm, totalCargoUnits) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm < 0) {
    return null;
  }
  const units = Math.max(0, parseInt(totalCargoUnits, 10) || 0);
  const price = LOGIVEX_PRICING.startFee 
    + (distanceKm * LOGIVEX_PRICING.pricePerKm) 
    + (units * LOGIVEX_PRICING.pricePerCargoUnit);
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
  const form = document.getElementById('quote-form');
  const messageEl = document.getElementById('form-message');
  const submitButton = document.getElementById('submit-button');
  const pickupInput = document.getElementById('pickupAddress');
  const dropoffInput = document.getElementById('dropoffAddress');
  const languageSelect = document.getElementById('language-select');

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

  // Helper: Check if an element is visible and enabled
  function isFieldVisibleAndEnabled(input) {
    if (!input) return false;
    if (input.disabled) return false;
    
    const style = window.getComputedStyle(input);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    
    // Check parent containers too
    let parent = input.parentElement;
    while (parent) {
      const parentStyle = window.getComputedStyle(parent);
      if (parentStyle.display === 'none' || parentStyle.visibility === 'hidden') return false;
      parent = parent.parentElement;
    }
    
    return true;
  }

  // Helper: Clear all field errors
  function clearAllFieldErrors() {
    document.querySelectorAll('.field-error').forEach(el => {
      el.classList.remove('field-error');
    });
    document.querySelectorAll('.cargo-field').forEach(el => {
      el.classList.remove('field-error');
    });
    document.querySelectorAll('.other-description-container').forEach(el => {
      el.classList.remove('field-error');
    });
  }

  // Helper: Validate cargo items
  function validateCargoItems() {
    const container = document.getElementById('cargo-items-container');
    if (!container) return { valid: false, error: 'Cargo items container not found' };
    
    const rows = container.querySelectorAll('.cargo-row');
    if (rows.length === 0) return { valid: false, error: 'At least one cargo item is required' };
    
    let hasAnyValidItem = false;
    let firstErrorField = null;
    
    for (const row of rows) {
      // Skip if row is hidden
      const rowStyle = window.getComputedStyle(row);
      if (rowStyle.display === 'none') continue;
      
      const typeSelect = row.querySelector('.cargo-type-select');
      const quantityInput = row.querySelector('input[type="number"]');
      
      if (!typeSelect || !quantityInput) continue;
      
      // Check if fields are visible and enabled
      const typeVisible = isFieldVisibleAndEnabled(typeSelect);
      const quantityVisible = isFieldVisibleAndEnabled(quantityInput);
      
      if (!typeVisible || !quantityVisible) continue;
      
      const type = typeSelect.value.trim();
      const quantity = parseInt(quantityInput.value, 10) || 0;
      
      if (!type) {
        typeSelect.closest('.cargo-field').classList.add('field-error');
        return { valid: false, error: 'Please complete all shipment details.', field: typeSelect };
      }
      
      if (quantity <= 0) {
        quantityInput.closest('.cargo-field').classList.add('field-error');
        return { valid: false, error: 'Please complete all shipment details.', field: quantityInput };
      }
      
      // Check for "other" description requirement
      if (type === 'other') {
        const otherContainer = document.querySelector('.other-description-container');
        if (otherContainer) {
          const otherStyle = window.getComputedStyle(otherContainer);
          if (otherStyle.display !== 'none') {
            const descInput = otherContainer.querySelector('input[name="otherCargoDescription"]');
            if (descInput && isFieldVisibleAndEnabled(descInput)) {
              if (!descInput.value.trim()) {
                otherContainer.classList.add('field-error');
                return { valid: false, error: 'Please complete all shipment details.', field: descInput };
              }
            }
          }
        }
      }
      
      hasAnyValidItem = true;
    }
    
    if (!hasAnyValidItem) {
      return { valid: false, error: 'Please complete all shipment details.', field: firstErrorField };
    }
    
    return { valid: true };
  }

  // Helper: Set field error with message
  function setFieldErrorWithMessage(inputEl, message) {
    setFieldError(inputEl);
    setMessage(message, 'error');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('', null);
    clearAllFieldErrors();

    const formData = new FormData(form);
    const pickupAddress = formData.get('pickupAddress')?.toString().trim();
    const dropoffAddress = formData.get('dropoffAddress')?.toString().trim();
    const pickupDateInput = document.getElementById('date');
    const nameInput = document.getElementById('customerName');
    const emailInput = document.getElementById('customerEmail');

    // Debug: log all validation values before any checks
    console.log('pickup:', pickupInput?.value);
    console.log('dropoff:', dropoffInput?.value);
    console.log('pickupDate:', pickupDateInput?.value);
    console.log('name:', nameInput?.value);
    console.log('email:', emailInput?.value);
    const container = document.getElementById('cargo-items-container');
    if (container) {
      container.querySelectorAll('.cargo-row').forEach((row, i) => {
        const typeSelect = row.querySelector('.cargo-type-select');
        const quantityInput = row.querySelector('input[type="number"]');
        const descInput = document.querySelector('input[name="otherCargoDescription"]');
        console.log('cargo row:', i, typeSelect?.value, quantityInput?.value, descInput?.value);
      });
    }

    // Collect all cargo items from the form
    const cargoItems = collectCargoItems();
    const totalCargoUnits = cargoItems.reduce((sum, item) => sum + item.quantity, 0);

    const payload = {
      pickupAddress,
      dropoffAddress,
      date: formData.get('date'),
      cargoItems,
      totalCargoUnits,
      otherCargoDescription: formData.get('otherCargoDescription')?.toString().trim() || null,
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

    // Validate addresses (non-empty; manual entry or Google Places; only if visible)
    const dateInput = document.getElementById('date');
    if (isFieldVisibleAndEnabled(pickupInput) && !payload.pickupAddress) {
      console.log('VALIDATION FAILED: pickupAddress');
      setMessage('Please complete all shipment details.', 'error');
      setFieldError(pickupInput);
      pickupInput.focus();
      return;
    }
    if (isFieldVisibleAndEnabled(dropoffInput) && !payload.dropoffAddress) {
      console.log('VALIDATION FAILED: dropoffAddress');
      setMessage('Please complete all shipment details.', 'error');
      setFieldError(dropoffInput);
      dropoffInput.focus();
      return;
    }

    // Validate date (only if visible)
    if (isFieldVisibleAndEnabled(pickupDateInput) && !payload.date) {
      console.log('VALIDATION FAILED: date');
      setMessage('Please complete all shipment details.', 'error');
      setFieldError(pickupDateInput);
      pickupDateInput.focus();
      return;
    }

    // Validate cargo items (at least one row; type, quantity, description if other)
    const cargoValidation = validateCargoItems();
    if (!cargoValidation.valid) {
      console.log('VALIDATION FAILED: cargo', cargoValidation.error);
      setMessage(cargoValidation.error || 'Please complete all shipment details.', 'error');
      if (cargoValidation.field) {
        cargoValidation.field.focus();
      }
      return;
    }

    // Validate customer name (only if visible)
    if (isFieldVisibleAndEnabled(nameInput) && !payload.customerName) {
      console.log('VALIDATION FAILED: customerName');
      setMessage('Please complete all shipment details.', 'error');
      setFieldError(nameInput);
      nameInput.focus();
      return;
    }

    // Validate customer email (only if visible) — simple check: must contain @
    if (isFieldVisibleAndEnabled(emailInput)) {
      const emailVal = (emailInput.value || '').trim();
      if (!emailVal || !emailVal.includes('@')) {
        console.log('VALIDATION FAILED: customerEmail');
        setMessage('Please complete all shipment details.', 'error');
        setFieldError(emailInput);
        emailInput.focus();
        return;
      }
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
        const price = calculateTransportPriceClient(logivexLastDistanceKm, totalCargoUnits);
        if (price != null) {
          payload.calculatedPrice = price;
        }
      }
    } catch (err) {
      console.warn('Unable to calculate distance/price automatically:', err);
    }

    // Set loading state
    const buttonLabel = submitButton.querySelector('.button-label');
    if (buttonLabel) buttonLabel.textContent = 'Calculating quote…';
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
        // Reset cargo management
        cargoRowCounter = 1;
        updateRemoveButtons();
        updateOtherDescriptionVisibility();
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
      // Restore button state
      submitButton.disabled = false;
      submitButton.classList.remove('loading');
      if (buttonLabel) buttonLabel.textContent = 'Send quote request';
    }
  }

  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  // Initialize cargo management
  initCargoManagement();

  // Admin Demo Mode: show "Generate Demo Quote" only for logged-in admins
  (function initAdminDemoMode() {
    const adminSection = document.getElementById('admin-demo-section');
    const demoBtn = document.getElementById('demo-prefill-btn');
    if (!adminSection || !demoBtn) return;

    function applyDemoQuoteToForm(demoData, userEmail, userName) {
      const pickupEl = document.getElementById('pickupAddress');
      const dropoffEl = document.getElementById('dropoffAddress');
      const dateEl = document.getElementById('date');
      const notesEl = document.getElementById('notes');
      const emailEl = document.getElementById('customerEmail');
      const nameEl = document.getElementById('customerName');
      if (pickupEl) pickupEl.value = demoData.pickupAddress || '';
      if (dropoffEl) dropoffEl.value = demoData.dropoffAddress || '';
      if (dateEl) dateEl.value = demoData.date || '';
      if (notesEl) notesEl.value = demoData.notes || '';
      if (emailEl) emailEl.value = userEmail || '';
      if (nameEl) nameEl.value = userName || 'Demo Admin';
      logivexPickupPlace = null;
      logivexDropoffPlace = null;

      const container = document.getElementById('cargo-items-container');
      if (container && demoData.cargoItems && demoData.cargoItems.length > 0) {
        let rows = container.querySelectorAll('.cargo-row');
        while (rows.length > 1) {
          removeCargoRow(rows[rows.length - 1]);
          rows = container.querySelectorAll('.cargo-row');
        }
        const firstRow = rows[0];
        if (firstRow) {
          const typeSelect = firstRow.querySelector('.cargo-type-select');
          const qtyInput = firstRow.querySelector('input[type="number"]');
          if (typeSelect) typeSelect.value = demoData.cargoItems[0].type || 'pallets';
          if (qtyInput) qtyInput.value = String(demoData.cargoItems[0].quantity || 1);
        }
        for (let i = 1; i < demoData.cargoItems.length; i++) {
          addCargoRow();
          rows = container.querySelectorAll('.cargo-row');
          const lastRow = rows[rows.length - 1];
          if (lastRow) {
            const typeSelect = lastRow.querySelector('.cargo-type-select');
            const qtyInput = lastRow.querySelector('input[type="number"]');
            if (typeSelect) typeSelect.value = demoData.cargoItems[i].type || 'pallets';
            if (qtyInput) qtyInput.value = String(demoData.cargoItems[i].quantity || 1);
          }
        }
        updateRemoveButtons();
        updateOtherDescriptionVisibility();
      }
      refreshDistanceAndPrice();
      updateQuoteSummary();
    }

    demoBtn.addEventListener('click', () => {
      if (typeof window.generateDemoQuote !== 'function') return;
      const demoData = window.generateDemoQuote();
      const userEmail = window.__logivexAdminDemoEmail;
      const userName = window.__logivexAdminDemoName;
      applyDemoQuoteToForm(demoData, userEmail, userName);
    });

    fetch('/api/config')
      .then((r) => r.json())
      .then((config) => {
        if (!config.supabaseUrl || !config.supabaseAnonKey || !window.supabase || !window.supabase.createClient) return null;
        const supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        return supabase.auth.getSession().then(({ data: { session } }) => ({ session, supabase }));
      })
      .then((result) => {
        if (!result || !result.session) return null;
        const token = result.session.access_token;
        return fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => ({ data, session: result.session }));
      })
      .then((result) => {
        if (!result || !result.data || !result.data.user) return;
        console.log('Current user role:', result.data.user.role);
        if (result.data.user.role !== 'admin') return;
        adminSection.style.display = 'block';
        window.__logivexAdminDemoEmail = result.session.user.email || '';
        window.__logivexAdminDemoName = result.session.user.user_metadata?.name || result.session.user.user_metadata?.full_name || 'Demo Admin';
      })
      .catch(() => {});
  })();
});

// Called by the Google Maps script via the `callback` parameter.
// Sets up Places Autocomplete on pickup and drop-off address fields.
function initLogivexMaps() {
  if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
    console.warn('Google Maps Places library not available.');
    return;
  }

  const pickupInput = document.getElementById('pickupAddress');
  const dropoffInput = document.getElementById('dropoffAddress');

  if (!pickupInput || !dropoffInput) {
    return;
  }

  const options = {
    fields: ['formatted_address', 'geometry', 'place_id', 'address_components'],
    types: ['geocode'],
    componentRestrictions: {
      country: LOGIVEX_EU_COUNTRIES.map(c => c.toLowerCase())
    }
  };

  const pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput, options);
  const dropoffAutocomplete = new google.maps.places.Autocomplete(dropoffInput, options);

  pickupAutocomplete.addListener('place_changed', () => {
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
  const totalCargoUnits = calculateTotalCargoUnits();

  if (!pickupAddress || !dropoffAddress) {
    return;
  }

  try {
    const distanceKm = await calculateDistance(pickupAddress, dropoffAddress);
    if (typeof distanceKm === 'number') {
      logivexLastDistanceKm = distanceKm;
      updateDistanceDisplay(distanceKm);
      updatePriceEstimate(distanceKm, totalCargoUnits);
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

function updatePriceEstimate(distanceKm, totalCargoUnits) {
  const priceEl = document.getElementById('price-estimate');
  const summaryPriceEl = document.getElementById('summary-price');
  if (!priceEl && !summaryPriceEl) return;

  const units = parseInt(totalCargoUnits, 10) || 0;
  if (units === 0 || typeof distanceKm !== 'number') {
    if (priceEl) priceEl.textContent = '–';
    if (summaryPriceEl) summaryPriceEl.textContent = '–';
    return;
  }

  const price = calculateTransportPriceClient(distanceKm, units);
  const formatted = price != null ? `€${price.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '–';

  if (priceEl) priceEl.textContent = formatted;
  if (summaryPriceEl) summaryPriceEl.textContent = formatted;
}

function updateQuoteSummary() {
  const routeEl = document.getElementById('summary-route');
  const cargoEl = document.getElementById('summary-cargo');

  if (routeEl) {
    const from = logivexPickupPlace?.formattedAddress || '–';
    const to = logivexDropoffPlace?.formattedAddress || '–';
    routeEl.textContent = from !== '–' && to !== '–' ? `${from} → ${to}` : '–';
  }

  if (cargoEl) {
    const cargoItems = collectCargoItems();
    if (cargoItems.length === 0) {
      cargoEl.textContent = '–';
    } else {
      const summary = cargoItems.map(item => {
        if (item.type === 'other' && item.description) {
          return `${item.quantity} ${item.type} (${item.description})`;
        }
        return `${item.quantity} ${item.type}`;
      }).join(', ');
      cargoEl.textContent = summary;
    }
  }
}

// ========================================
// Cargo Management Functions
// ========================================

function initCargoManagement() {
  const addBtn = document.getElementById('add-cargo-btn');
  const container = document.getElementById('cargo-items-container');

  if (addBtn) {
    addBtn.addEventListener('click', addCargoRow);
  }

  // Set up listeners for the initial row
  if (container) {
    const initialRow = container.querySelector('.cargo-row');
    if (initialRow) {
      setupCargoRowListeners(initialRow);
    }
  }
}

function addCargoRow() {
  const container = document.getElementById('cargo-items-container');
  if (!container) return;

  const newRow = document.createElement('div');
  newRow.className = 'cargo-row';
  newRow.setAttribute('data-row-index', cargoRowCounter++);
  newRow.innerHTML = `
    <div class="cargo-field">
      <label>Cargo type</label>
      <select name="cargoType[]" class="cargo-type-select">
        <option value="">Select type</option>
        <option value="pallets">Pallets</option>
        <option value="boxes">Boxes</option>
        <option value="other">Other</option>
      </select>
    </div>
    <div class="cargo-field quantity-field">
      <label>Quantity</label>
      <input type="number" name="cargoQuantity[]" min="1" step="1" value="1" />
    </div>
    <button type="button" class="remove-cargo-btn" aria-label="Remove cargo item">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </button>
  `;

  container.appendChild(newRow);
  setupCargoRowListeners(newRow);
  updateRemoveButtons();
  updateOtherDescriptionVisibility();
  refreshDistanceAndPrice();
}

function removeCargoRow(row) {
  const container = document.getElementById('cargo-items-container');
  if (!container) return;

  const rows = container.querySelectorAll('.cargo-row');
  if (rows.length <= 1) {
    // Don't remove the last row
    return;
  }

  row.remove();
  updateRemoveButtons();
  updateOtherDescriptionVisibility();
  refreshDistanceAndPrice();
}

function setupCargoRowListeners(row) {
  const removeBtn = row.querySelector('.remove-cargo-btn');
  const typeSelect = row.querySelector('.cargo-type-select');
  const quantityInput = row.querySelector('input[type="number"]');

  if (removeBtn) {
    removeBtn.addEventListener('click', () => removeCargoRow(row));
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      updateOtherDescriptionVisibility();
      updateQuoteSummary();
    });
  }

  if (quantityInput) {
    quantityInput.addEventListener('input', () => {
      refreshDistanceAndPrice();
      updateQuoteSummary();
    });
  }
}

function updateRemoveButtons() {
  const container = document.getElementById('cargo-items-container');
  if (!container) return;

  const rows = container.querySelectorAll('.cargo-row');
  const showRemove = rows.length > 1;

  rows.forEach(row => {
    const removeBtn = row.querySelector('.remove-cargo-btn');
    if (removeBtn) {
      removeBtn.style.display = showRemove ? 'flex' : 'none';
    }
  });
}

function updateOtherDescriptionVisibility() {
  const container = document.getElementById('cargo-items-container');
  const otherContainer = document.querySelector('.other-description-container');
  if (!container || !otherContainer) return;

  const rows = container.querySelectorAll('.cargo-row');
  let hasOther = false;

  rows.forEach(row => {
    const typeSelect = row.querySelector('.cargo-type-select');
    if (typeSelect && typeSelect.value === 'other') {
      hasOther = true;
    }
  });

  otherContainer.style.display = hasOther ? 'block' : 'none';
}

function collectCargoItems() {
  const container = document.getElementById('cargo-items-container');
  if (!container) return [];

  const rows = container.querySelectorAll('.cargo-row');
  const items = [];

  rows.forEach(row => {
    const typeSelect = row.querySelector('.cargo-type-select');
    const quantityInput = row.querySelector('input[type="number"]');

    if (typeSelect && quantityInput) {
      const type = typeSelect.value;
      const quantity = parseInt(quantityInput.value, 10) || 0;

      if (type && quantity > 0) {
        const item = { type, quantity };
        if (type === 'other') {
          const descInput = document.querySelector('input[name="otherCargoDescription"]');
          if (descInput && descInput.value.trim()) {
            item.description = descInput.value.trim();
          }
        }
        items.push(item);
      }
    }
  });

  return items;
}

function calculateTotalCargoUnits() {
  const items = collectCargoItems();
  return items.reduce((sum, item) => sum + item.quantity, 0);
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
