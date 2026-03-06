(function () {
  const EXAMPLE_EMAIL = `Hello,

We need transport from Rotterdam to Hamburg.

Cargo: 12 pallets
Weight: 4800kg

Pickup tomorrow at 08:00.

Regards`;

  const STEP_DURATION_MS = 600;

  const emailInput = document.getElementById('email-input');
  const extractBtn = document.getElementById('extract-btn');
  const formMessage = document.getElementById('form-message');
  const resultSection = document.getElementById('result-section');
  const resultJson = document.getElementById('result-json');
  const orderCardContainer = document.getElementById('order-card-container');
  const copyBtn = document.getElementById('copy-btn');
  const exampleBtn = document.getElementById('example-btn');
  const clearBtn = document.getElementById('clear-btn');
  const aiProcessingSection = document.getElementById('ai-processing-section');
  const routeSection = document.getElementById('route-section');
  const routeText = document.getElementById('route-text');
  const routeMap = document.getElementById('route-map');
  const routeFallback = document.getElementById('route-fallback');
  const routePickupLabel = document.getElementById('route-pickup-label');
  const routeDeliveryLabel = document.getElementById('route-delivery-label');
  const routeDistance = document.getElementById('route-distance');

  let lastExtractedData = null;
  let showingJson = false;
  let mapsLoaded = false;
  let mapsCallback = null;

  function setMessage(text, type) {
    formMessage.textContent = text || '';
    formMessage.className = 'form-message' + (type === 'success' ? ' form-message--success' : type === 'error' ? ' form-message--error' : '');
  }

  function setLoading(loading) {
    if (!extractBtn) return;
    extractBtn.disabled = loading;
    if (loading) {
      extractBtn.classList.add('loading');
      extractBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Extracting…';
    } else {
      extractBtn.classList.remove('loading');
      extractBtn.innerHTML = 'Extract Order';
    }
  }

  function escapeHtml(s) {
    if (s == null || s === '') return '—';
    const div = document.createElement('div');
    div.textContent = String(s);
    return div.innerHTML;
  }

  function displayValue(val) {
    return val != null && val !== '' ? escapeHtml(String(val)) : '—';
  }

  function runExtractionAnimation() {
    return new Promise((resolve) => {
      if (!aiProcessingSection) {
        resolve();
        return;
      }
      aiProcessingSection.hidden = false;
      const steps = [
        document.getElementById('step-1'),
        document.getElementById('step-2'),
        document.getElementById('step-3'),
        document.getElementById('step-4'),
        document.getElementById('step-5')
      ].filter(Boolean);

      steps.forEach((el) => {
        el.classList.remove('active', 'done');
        if (el.classList.contains('ai-step-complete')) el.classList.remove('visible');
      });

      let current = 0;
      function next() {
        if (current > 0 && steps[current - 1]) {
          steps[current - 1].classList.remove('active');
          steps[current - 1].classList.add('done');
        }
        if (current < steps.length) {
          if (steps[current].classList.contains('ai-step-complete')) {
            steps[current].classList.add('visible');
          } else {
            steps[current].classList.add('active');
          }
          current++;
          if (current < steps.length) {
            setTimeout(next, STEP_DURATION_MS);
          } else {
            setTimeout(() => {
              if (steps[steps.length - 1]) {
                steps[steps.length - 1].classList.remove('active');
                steps[steps.length - 1].classList.add('done');
              }
              resolve();
            }, STEP_DURATION_MS);
          }
        } else {
          resolve();
        }
      }
      next();
    });
  }

  function hideProcessing() {
    if (aiProcessingSection) aiProcessingSection.hidden = true;
  }

  function renderOrderCard(data) {
    if (!orderCardContainer) return;
    const d = data || {};
    orderCardContainer.innerHTML = `
      <div class="order-card">
        <div class="order-card-row">
          <span class="order-card-label">Pickup</span>
          <span class="order-card-value">${displayValue(d.pickup_location)}</span>
        </div>
        <div class="order-card-row">
          <span class="order-card-label">Delivery</span>
          <span class="order-card-value">${displayValue(d.delivery_location)}</span>
        </div>
        <div class="order-card-row">
          <span class="order-card-label">Cargo</span>
          <span class="order-card-value">${displayValue(d.quantity && d.cargo_type ? `${d.quantity} ${d.cargo_type}` : d.cargo_type || displayValue(d.cargo_type))}</span>
        </div>
        <div class="order-card-row">
          <span class="order-card-label">Weight</span>
          <span class="order-card-value">${displayValue(d.weight)}</span>
        </div>
        <div class="order-card-row">
          <span class="order-card-label">Pickup time</span>
          <span class="order-card-value">${displayValue(d.pickup_time)}</span>
        </div>
      </div>
    `;
    orderCardContainer.classList.add('order-card-visible');
  }

  function renderRouteSection(data) {
    if (!routeSection || !routeText || !routeDistance) return;
    const pickup = data?.pickup_location;
    const delivery = data?.delivery_location;
    const distanceKm = data?.distance_km;

    routeSection.hidden = !(pickup || delivery);
    if (!pickup && !delivery) return;

    routeText.textContent = pickup && delivery ? `${pickup} → ${delivery}` : pickup || delivery || '—';
    routeDistance.textContent = distanceKm != null ? `Estimated distance: ${Math.round(distanceKm)} km` : 'Estimated distance: —';

    if (routeFallback) {
      routeFallback.hidden = false;
      if (routePickupLabel) routePickupLabel.textContent = pickup || '—';
      if (routeDeliveryLabel) routeDeliveryLabel.textContent = delivery || '—';
    }
    if (routeMap) {
      routeMap.innerHTML = '';
      routeMap.hidden = true;
    }

    if (mapsCallback && pickup && delivery) {
      mapsCallback(pickup, delivery, routeMap, (routeSuccess) => {
        if (routeSuccess && routeMap) {
          routeMap.hidden = false;
          if (routeFallback) routeFallback.hidden = true;
        }
      });
    }
  }

  function showResult(data) {
    lastExtractedData = data;
    if (!resultSection || !orderCardContainer) return;
    const clean = data && typeof data === 'object' ? data : {};
    renderOrderCard(clean);
    renderRouteSection(clean);
    resultJson.textContent = typeof clean === 'object' ? JSON.stringify(clean, null, 2) : String(clean);
    showingJson = false;
    resultJson.hidden = true;
    orderCardContainer.hidden = false;
    resultSection.hidden = false;
    resultSection.classList.add('result-visible');
  }

  function hideResult() {
    if (resultSection) {
      resultSection.hidden = true;
      resultSection.classList.remove('result-visible');
    }
    if (routeSection) routeSection.hidden = true;
    lastExtractedData = null;
  }

  function copyOrder() {
    if (!lastExtractedData) return;
    try {
      const text = JSON.stringify(lastExtractedData, null, 2);
      navigator.clipboard.writeText(text).then(() => {
        setMessage('Copied to clipboard.', 'success');
        if (copyBtn) {
          const orig = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = orig; }, 2000);
        }
      }).catch(() => setMessage('Could not copy.', 'error'));
    } catch (e) {
      setMessage('Could not copy.', 'error');
    }
  }

  async function fillExample() {
    hideResult();
    exampleBtn.disabled = true;
    exampleBtn.textContent = 'Generating…';
    setMessage('Generating sample email with AI…', '');
    try {
      const response = await fetch('/api/generate-sample-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success && data.data && data.data.email) {
        if (emailInput) {
          emailInput.value = data.data.email;
          emailInput.focus();
        }
        setMessage('AI-generated email loaded. Click Extract Order to try.', 'success');
      } else {
        if (emailInput) {
          emailInput.value = EXAMPLE_EMAIL;
          emailInput.focus();
        }
        setMessage(data.message || 'Could not generate email. Default example loaded.', 'error');
      }
    } catch (err) {
      setMessage('Network error. Using default example.', 'error');
      if (emailInput) {
        emailInput.value = EXAMPLE_EMAIL;
        emailInput.focus();
      }
    } finally {
      exampleBtn.disabled = false;
      exampleBtn.textContent = 'Use example email';
    }
  }

  function clearForm() {
    if (emailInput) emailInput.value = '';
    setMessage('');
    hideResult();
    hideProcessing();
    if (emailInput) emailInput.focus();
  }

  async function handleExtract() {
    const text = emailInput && emailInput.value ? emailInput.value.trim() : '';
    if (!text) {
      setMessage('Please paste an email to extract.', 'error');
      return;
    }

    setMessage('');
    hideResult();
    setLoading(true);

    const animationPromise = runExtractionAnimation();
    let apiPromise;
    try {
      apiPromise = fetch('/api/extract-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: text })
      });
    } catch (e) {
      hideProcessing();
      setMessage('Network error. Please check your connection and try again.', 'error');
      setLoading(false);
      return;
    }

    let response;
    let data;
    try {
      response = await apiPromise;
      data = await response.json().catch(() => ({}));
    } catch (err) {
      console.error('Extract error:', err);
      hideProcessing();
      setMessage('Network error. Please check your connection and try again.', 'error');
      setLoading(false);
      return;
    }

    if (!response.ok || data.success === false) {
      hideProcessing();
      setMessage(data.message || data.error || 'Extraction failed. Please try again.', 'error');
      setLoading(false);
      return;
    }

    const payload = data.data || data;
    await animationPromise;
    hideProcessing();
    showResult(payload);
    setMessage('Transport order extracted successfully.', 'success');
    setLoading(false);
  }

  function initMaps(apiKey) {
    if (mapsLoaded || !apiKey) return;
    mapsLoaded = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=window.__emailDemoMapsReady`;
    script.async = true;
    script.defer = true;
    window.__emailDemoMapsReady = function () {
      if (typeof google === 'undefined' || !google.maps) return;
      mapsCallback = function (origin, destination, mapEl, onDone) {
        if (!mapEl || !origin || !destination) {
          if (onDone) onDone(false);
          return;
        }
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer();
        const map = new google.maps.Map(mapEl, {
          zoom: 6,
          center: { lat: 51.5, lng: 5 },
          disableDefaultUI: true,
          zoomControl: true
        });
        directionsRenderer.setMap(map);
        directionsService.route(
          {
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING
          },
          function (result, status) {
            if (status === 'OK' && result.routes && result.routes[0]) {
              directionsRenderer.setDirections(result);
              var bounds = new google.maps.LatLngBounds();
              result.routes[0].legs.forEach(function (leg) {
                bounds.extend(leg.start_location);
                bounds.extend(leg.end_location);
              });
              map.fitBounds(bounds);
              if (onDone) onDone(true);
            } else {
              if (onDone) onDone(false);
            }
          }
        );
      };
    };
    document.head.appendChild(script);
  }

  fetch('/api/config')
    .then((r) => r.json())
    .then((cfg) => {
      if (cfg && cfg.googleMapsApiKey) initMaps(cfg.googleMapsApiKey);
    })
    .catch(() => {});

  if (extractBtn && emailInput) extractBtn.addEventListener('click', handleExtract);
  if (exampleBtn) exampleBtn.addEventListener('click', fillExample);
  if (clearBtn) clearBtn.addEventListener('click', clearForm);
  if (copyBtn) copyBtn.addEventListener('click', copyOrder);
})();
