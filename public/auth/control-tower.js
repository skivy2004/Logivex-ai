(function () {
  'use strict';

  var MOCK_KPI = {
    aiEmailsToday: 47,
    transportOrdersGenerated: 31,
    activeShipments: 12,
    pendingQuotes: 8,
    timeSavedHours: 24,
    successRate: 94
  };

  var MOCK_ACTIVITY = [
    { time: '2 min ago', text: 'AI processed new transport request email' },
    { time: '5 min ago', text: 'Transport quote generated automatically' },
    { time: '12 min ago', text: 'New shipment added to system' },
    { time: '18 min ago', text: 'Automation workflow executed' },
    { time: '25 min ago', text: 'AI extracted order from inbound email' },
    { time: '32 min ago', text: 'Lead created from CRM message' }
  ];

  var MOCK_EMAILS = [
    { ts: '06:42', sender: 'jan@rotterdamlogistics.nl', cargo: 'Pallets', pickup: 'Rotterdam', delivery: 'Hamburg', weight: '4.2t', status: 'processed' },
    { ts: '06:18', sender: 'anna@cargoflow.de', cargo: 'Boxes', pickup: 'Berlin', delivery: 'Munich', weight: '1.8t', status: 'processed' },
    { ts: '05:55', sender: 'peter@antwerpfreight.be', cargo: 'Pallets', pickup: 'Antwerp', delivery: 'Paris', weight: '12t', status: 'pending' },
    { ts: '05:31', sender: 'maria@eurotransit.es', cargo: 'Containers', pickup: 'Madrid', delivery: 'Lyon', weight: '8.5t', status: 'processed' },
    { ts: '05:02', sender: 'support@quickfreight.nl', cargo: 'Pallets', pickup: 'Amsterdam', delivery: 'Düsseldorf', weight: '6.1t', status: 'failed' }
  ];

  var MOCK_ORDERS = [
    { id: 'ORD-2847', pickup: 'Rotterdam', delivery: 'Hamburg', cargo: 'Pallets', weight: '4.2t', date: '2025-03-06', status: 'in_transit' },
    { id: 'ORD-2846', pickup: 'Amsterdam', delivery: 'Berlin', cargo: 'Boxes', weight: '1.8t', date: '2025-03-06', status: 'scheduled' },
    { id: 'ORD-2845', pickup: 'Antwerp', delivery: 'Munich', cargo: 'Pallets', weight: '12t', date: '2025-03-05', status: 'delivered' },
    { id: 'ORD-2844', pickup: 'Düsseldorf', delivery: 'Paris', cargo: 'Containers', weight: '8.5t', date: '2025-03-05', status: 'delivered' },
    { id: 'ORD-2843', pickup: 'Cologne', delivery: 'Warsaw', cargo: 'Pallets', weight: '6.1t', date: '2025-03-05', status: 'pending' }
  ];

  var MOCK_CHART_EMAILS = [32, 38, 41, 35, 44, 40, 47];
  var MOCK_CHART_ORDERS = [22, 28, 25, 30, 27, 26, 31];
  var MOCK_CHART_SUCCESS = 94;

  function esc(s) {
    if (s == null || s === '') return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderKpis() {
    var ids = ['kpi-emails', 'kpi-orders', 'kpi-shipments', 'kpi-quotes', 'kpi-time', 'kpi-rate'];
    var vals = [MOCK_KPI.aiEmailsToday, MOCK_KPI.transportOrdersGenerated, MOCK_KPI.activeShipments, MOCK_KPI.pendingQuotes, MOCK_KPI.timeSavedHours + 'h', MOCK_KPI.successRate + '%'];
    ids.forEach(function (id, i) {
      var el = document.getElementById(id);
      if (el) el.textContent = vals[i];
    });
  }

  function renderActivity() {
    var list = document.getElementById('activity-list');
    if (!list) return;
    list.innerHTML = MOCK_ACTIVITY.map(function (a) {
      return '<li class="activity-item"><span class="activity-item__dot" aria-hidden="true"></span><div><div class="activity-item__time">' + esc(a.time) + '</div><div class="activity-item__text">' + esc(a.text) + '</div></div></li>';
    }).join('');
  }

  function renderEmailsTable() {
    var tbody = document.getElementById('ai-emails-tbody');
    if (!tbody) return;
    tbody.innerHTML = MOCK_EMAILS.map(function (r) {
      return '<tr><td>' + esc(r.ts) + '</td><td>' + esc(r.sender) + '</td><td>' + esc(r.cargo) + '</td><td>' + esc(r.pickup) + '</td><td>' + esc(r.delivery) + '</td><td>' + esc(r.weight) + '</td><td><span class="status-badge ' + esc(r.status) + '">' + esc(r.status) + '</span></td></tr>';
    }).join('');
  }

  function renderOrdersTable() {
    var tbody = document.getElementById('transport-orders-tbody');
    if (!tbody) return;
    tbody.innerHTML = MOCK_ORDERS.map(function (r) {
      var status = r.status.replace('_', ' ');
      return '<tr><td>' + esc(r.id) + '</td><td>' + esc(r.pickup) + '</td><td>' + esc(r.delivery) + '</td><td>' + esc(r.cargo) + '</td><td>' + esc(r.weight) + '</td><td>' + esc(r.date) + '</td><td><span class="status-badge ' + esc(r.status) + '">' + esc(status) + '</span></td></tr>';
    }).join('');
  }

  function initCharts() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.color = '#64748b';
    Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.06)';
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    var days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var blue = 'rgba(59, 130, 246, 0.9)';
    var purple = 'rgba(139, 92, 246, 0.9)';

    var emailsCtx = document.getElementById('chart-emails');
    if (emailsCtx) {
      new Chart(emailsCtx, {
        type: 'line',
        data: {
          labels: days,
          datasets: [{ label: 'Emails', data: MOCK_CHART_EMAILS, borderColor: blue, backgroundColor: 'rgba(59, 130, 246, 0.15)', fill: true, tension: 0.3 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
      });
    }

    var ordersCtx = document.getElementById('chart-orders');
    if (ordersCtx) {
      new Chart(ordersCtx, {
        type: 'bar',
        data: {
          labels: days,
          datasets: [{ label: 'Orders', data: MOCK_CHART_ORDERS, backgroundColor: purple }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
      });
    }

    var successCtx = document.getElementById('chart-success');
    if (successCtx) {
      new Chart(successCtx, {
        type: 'doughnut',
        data: {
          labels: ['Success', 'Failed'],
          datasets: [{ data: [MOCK_CHART_SUCCESS, 100 - MOCK_CHART_SUCCESS], backgroundColor: ['#22c55e', 'rgba(239, 68, 68, 0.8)'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
      });
    }
  }

  function initMap() {
    var mapEl = document.getElementById('control-tower-map');
    var fallback = document.getElementById('map-fallback');
    if (!mapEl) return;
    fetch('/api/config')
      .then(function (r) { return r.json(); })
      .then(function (config) {
        if (!config || !config.googleMapsApiKey) return;
        var script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(config.googleMapsApiKey) + '&callback=window.__controlTowerMapReady';
        script.async = true;
        script.defer = true;
        window.__controlTowerMapReady = function () {
          if (typeof google === 'undefined' || !google.maps) return;
          var map = new google.maps.Map(mapEl, { zoom: 5, center: { lat: 51.2, lng: 10.0 }, disableDefaultUI: false, zoomControl: true });
          var locations = [
            { lat: 51.92, lng: 4.48, label: 'Rotterdam' },
            { lat: 53.55, lng: 9.99, label: 'Hamburg' },
            { lat: 52.52, lng: 13.40, label: 'Berlin' },
            { lat: 51.22, lng: 4.40, label: 'Antwerp' },
            { lat: 48.14, lng: 11.58, label: 'Munich' }
          ];
          var bounds = new google.maps.LatLngBounds();
          locations.forEach(function (loc) {
            var m = new google.maps.Marker({ position: { lat: loc.lat, lng: loc.lng }, map: map, title: loc.label });
            bounds.extend(m.getPosition());
          });
          map.fitBounds(bounds, 50);
          mapEl.classList.add('map-loaded');
        };
        document.head.appendChild(script);
      })
      .catch(function () {});
  }

  renderKpis();
  renderActivity();
  renderEmailsTable();
  renderOrdersTable();
  initCharts();
  initMap();
})();
