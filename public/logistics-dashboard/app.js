(function () {
  'use strict';

  const MOCK_KPIS = {
    totalShipmentsToday: 47,
    totalShipmentsTodayTrend: 12,
    activeShipments: 23,
    activeShipmentsTrend: -2,
    deliveredToday: 31,
    deliveredTodayTrend: 8,
    delayedShipments: 4,
    delayedShipmentsTrend: -1,
    averageDeliveryTimeHours: 18.5,
    averageDeliveryTimeTrend: -0.5,
    onTimeDeliveryRate: 94.2,
    onTimeDeliveryRateTrend: 1.2,
    totalCargoWeightToday: 124500,
    totalCargoWeightTrend: 5,
    pendingTransportRequests: 12,
    pendingRequestsTrend: 3
  };

  const MOCK_SHIPMENTS_PER_DAY = [38, 42, 45, 41, 52, 48, 47];
  const MOCK_DAYS_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const MOCK_ONTIME_VS_DELAYED = { onTime: 94, delayed: 6 };

  const MOCK_WEIGHT_DISTRIBUTION = [
    { label: 'Pallets', value: 420 },
    { label: 'Boxes', value: 180 },
    { label: 'Containers', value: 85 },
    { label: 'Other', value: 65 }
  ];

  const MOCK_SHIPMENTS_BY_COUNTRY = [
    { country: 'Germany', count: 142 },
    { country: 'Netherlands', count: 98 },
    { country: 'Belgium', count: 67 },
    { country: 'France', count: 54 },
    { country: 'Poland', count: 41 }
  ];

  const MOCK_PICKUP_VS_DELIVERY = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    pickup: [42, 48, 45, 52, 58, 38, 44],
    delivery: [38, 44, 50, 48, 55, 42, 47]
  };

  const MOCK_ORDERS = [
    { id: 'ORD-2847', pickup: 'Rotterdam', delivery: 'Hamburg', cargo: 'Pallets', weight: '4.2t', date: '2025-03-06', status: 'in_transit' },
    { id: 'ORD-2846', pickup: 'Amsterdam', delivery: 'Berlin', cargo: 'Boxes', weight: '1.8t', date: '2025-03-06', status: 'scheduled' },
    { id: 'ORD-2845', pickup: 'Antwerp', delivery: 'Munich', cargo: 'Pallets', weight: '12t', date: '2025-03-05', status: 'delivered' },
    { id: 'ORD-2844', pickup: 'Düsseldorf', delivery: 'Paris', cargo: 'Containers', weight: '8.5t', date: '2025-03-05', status: 'delivered' },
    { id: 'ORD-2843', pickup: 'Cologne', delivery: 'Warsaw', cargo: 'Pallets', weight: '6.1t', date: '2025-03-05', status: 'delayed' },
    { id: 'ORD-2842', pickup: 'Brussels', delivery: 'Frankfurt', cargo: 'Boxes', weight: '2.4t', date: '2025-03-04', status: 'delivered' },
    { id: 'ORD-2841', pickup: 'Eindhoven', delivery: 'Stuttgart', cargo: 'Pallets', weight: '5.2t', date: '2025-03-04', status: 'in_transit' },
    { id: 'ORD-2840', pickup: 'Dortmund', delivery: 'Lyon', cargo: 'Other', weight: '3.1t', date: '2025-03-04', status: 'pending' },
    { id: 'ORD-2839', pickup: 'Hannover', delivery: 'Milan', cargo: 'Pallets', weight: '9.8t', date: '2025-03-03', status: 'delivered' },
    { id: 'ORD-2838', pickup: 'Leipzig', delivery: 'Prague', cargo: 'Boxes', weight: '1.2t', date: '2025-03-03', status: 'scheduled' }
  ];

  const STATUS_LABELS = {
    pending: 'Pending',
    scheduled: 'Scheduled',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    delayed: 'Delayed'
  };

  const CHART_COLORS = {
    primary: 'rgba(59, 130, 246, 0.9)',
    primaryLight: 'rgba(59, 130, 246, 0.5)',
    secondary: 'rgba(139, 92, 246, 0.9)',
    success: 'rgba(34, 197, 94, 0.9)',
    danger: 'rgba(239, 68, 68, 0.9)',
    neutral: 'rgba(100, 116, 139, 0.8)'
  };

  function renderKpis() {
    const grid = document.getElementById('kpi-grid');
    if (!grid) return;

    const items = [
      { title: 'Total Shipments Today', value: MOCK_KPIS.totalShipmentsToday, trend: MOCK_KPIS.totalShipmentsTodayTrend, suffix: '', dir: 'up' },
      { title: 'Active Shipments', value: MOCK_KPIS.activeShipments, trend: MOCK_KPIS.activeShipmentsTrend, suffix: '', dir: MOCK_KPIS.activeShipmentsTrend >= 0 ? 'up' : 'down' },
      { title: 'Delivered Today', value: MOCK_KPIS.deliveredToday, trend: MOCK_KPIS.deliveredTodayTrend, suffix: '', dir: 'up' },
      { title: 'Delayed Shipments', value: MOCK_KPIS.delayedShipments, trend: MOCK_KPIS.delayedShipmentsTrend, suffix: '', dir: 'down' },
      { title: 'Avg Delivery Time', value: MOCK_KPIS.averageDeliveryTimeHours + 'h', trend: MOCK_KPIS.averageDeliveryTimeTrend, suffix: 'h', dir: 'down' },
      { title: 'On-Time Delivery Rate', value: MOCK_KPIS.onTimeDeliveryRate + '%', trend: MOCK_KPIS.onTimeDeliveryRateTrend, suffix: '%', dir: 'up' },
      { title: 'Total Cargo Weight Today', value: (MOCK_KPIS.totalCargoWeightToday / 1000).toFixed(1) + 't', trend: MOCK_KPIS.totalCargoWeightTrend, suffix: '%', dir: 'up' },
      { title: 'Pending Transport Requests', value: MOCK_KPIS.pendingTransportRequests, trend: MOCK_KPIS.pendingRequestsTrend, suffix: '', dir: 'neutral' }
    ];

    grid.innerHTML = items.map(function (item) {
      const trendDir = item.dir === 'neutral' ? 'neutral' : (item.dir === 'up' ? 'up' : 'down');
      const trendText = item.trend >= 0 ? '+' + item.trend : item.trend;
      const trendSuffix = item.suffix || (typeof item.trend === 'number' && item.dir !== 'neutral' ? '%' : '');
      const indicator = item.dir === 'neutral' ? '' : '<span class="kpi-card__indicator kpi-card__indicator--' + trendDir + '">' + trendText + trendSuffix + ' vs yesterday</span>';
      return '<div class="kpi-card"><div class="kpi-card__title">' + escapeHtml(item.title) + '</div><div class="kpi-card__value">' + escapeHtml(String(item.value)) + '</div>' + indicator + '</div>';
    }).join('');
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderTable() {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    tbody.innerHTML = MOCK_ORDERS.map(function (row) {
      const statusClass = 'status-badge--' + row.status;
      const statusText = STATUS_LABELS[row.status] || row.status;
      return '<tr><td>' + escapeHtml(row.id) + '</td><td>' + escapeHtml(row.pickup) + '</td><td>' + escapeHtml(row.delivery) + '</td><td>' + escapeHtml(row.cargo) + '</td><td>' + escapeHtml(row.weight) + '</td><td>' + escapeHtml(row.date) + '</td><td><span class="status-badge ' + statusClass + '">' + escapeHtml(statusText) + '</span></td></tr>';
    }).join('');
  }

  function initCharts() {
    if (typeof Chart === 'undefined') return;

    Chart.defaults.color = '#64748b';
    Chart.defaults.borderColor = 'rgba(0, 0, 0, 0.06)';
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    var lineCtx = document.getElementById('chart-shipments-line');
    if (lineCtx) {
      new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: MOCK_DAYS_LABELS,
          datasets: [{
            label: 'Shipments',
            data: MOCK_SHIPMENTS_PER_DAY,
            borderColor: CHART_COLORS.primary,
            backgroundColor: CHART_COLORS.primaryLight,
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    var pieCtx = document.getElementById('chart-ontime-pie');
    if (pieCtx) {
      new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: ['On time', 'Delayed'],
          datasets: [{
            data: [MOCK_ONTIME_VS_DELAYED.onTime, MOCK_ONTIME_VS_DELAYED.delayed],
            backgroundColor: [CHART_COLORS.success, CHART_COLORS.danger],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }

    var weightCtx = document.getElementById('chart-weight-bar');
    if (weightCtx) {
      new Chart(weightCtx, {
        type: 'bar',
        data: {
          labels: MOCK_WEIGHT_DISTRIBUTION.map(function (d) { return d.label; }),
          datasets: [{
            label: 'Shipments',
            data: MOCK_WEIGHT_DISTRIBUTION.map(function (d) { return d.value; }),
            backgroundColor: [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.primaryLight, CHART_COLORS.neutral]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    var countryCtx = document.getElementById('chart-country-bar');
    if (countryCtx) {
      new Chart(countryCtx, {
        type: 'bar',
        data: {
          labels: MOCK_SHIPMENTS_BY_COUNTRY.map(function (d) { return d.country; }),
          datasets: [{
            label: 'Shipments',
            data: MOCK_SHIPMENTS_BY_COUNTRY.map(function (d) { return d.count; }),
            backgroundColor: CHART_COLORS.primary
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            y: { grid: { display: false } }
          }
        }
      });
    }

    var compCtx = document.getElementById('chart-pickup-delivery');
    if (compCtx) {
      new Chart(compCtx, {
        type: 'bar',
        data: {
          labels: MOCK_PICKUP_VS_DELIVERY.labels,
          datasets: [
            { label: 'Pickup', data: MOCK_PICKUP_VS_DELIVERY.pickup, backgroundColor: CHART_COLORS.primary },
            { label: 'Delivery', data: MOCK_PICKUP_VS_DELIVERY.delivery, backgroundColor: CHART_COLORS.secondary }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }
  }

  function initMap() {
    var mapEl = document.getElementById('dashboard-map');
    var fallbackEl = document.getElementById('map-fallback');
    if (!mapEl) return;

    fetch('/api/config')
      .then(function (r) { return r.json(); })
      .then(function (config) {
        if (!config || !config.googleMapsApiKey) return;

        var script = document.createElement('script');
        script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(config.googleMapsApiKey) + '&callback=window.__logisticsDashboardMapReady';
        script.async = true;
        script.defer = true;
        window.__logisticsDashboardMapReady = function () {
          if (typeof google === 'undefined' || !google.maps) return;

          var center = { lat: 51.0, lng: 10.0 };
          var map = new google.maps.Map(mapEl, {
            zoom: 5,
            center: center,
            styles: [
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'off' }] }
            ],
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: true,
            scaleControl: true
          });

          var locations = [
            { lat: 51.92, lng: 4.48, label: 'Rotterdam', type: 'pickup' },
            { lat: 53.55, lng: 9.99, label: 'Hamburg', type: 'delivery' },
            { lat: 52.37, lng: 4.89, label: 'Amsterdam', type: 'pickup' },
            { lat: 52.52, lng: 13.40, label: 'Berlin', type: 'delivery' },
            { lat: 51.22, lng: 4.40, label: 'Antwerp', type: 'pickup' },
            { lat: 48.14, lng: 11.58, label: 'Munich', type: 'delivery' }
          ];

          var bounds = new google.maps.LatLngBounds();
          locations.forEach(function (loc) {
            var marker = new google.maps.Marker({
              position: { lat: loc.lat, lng: loc.lng },
              map: map,
              title: loc.label + ' (' + loc.type + ')'
            });
            bounds.extend(marker.getPosition());
          });
          map.fitBounds(bounds, 48);
          mapEl.classList.add('map-loaded');
        };
        document.head.appendChild(script);
      })
      .catch(function () {});
  }

  function initFooterYear() {
    var el = document.getElementById('footer-year');
    if (el) el.textContent = new Date().getFullYear();
  }

  renderKpis();
  renderTable();
  initCharts();
  initMap();
  initFooterYear();
})();
