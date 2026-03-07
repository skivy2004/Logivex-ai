(function () {
  'use strict';

  var supabase = null;
  var features = [];
  var tbody = document.getElementById('features-tbody');
  var saveBtn = document.getElementById('save-btn');
  var saveStatus = document.getElementById('save-status');
  var adminMessage = document.getElementById('admin-message');
  var logoutLink = document.getElementById('logout-link');

  function setStatus(text, type) {
    if (!saveStatus) return;
    saveStatus.textContent = text || '';
    saveStatus.className = 'dashboard-message' + (type === 'success' ? ' success' : type === 'error' ? ' error' : '');
  }

  function setAdminMessage(text, type) {
    if (!adminMessage) return;
    adminMessage.textContent = text || '';
    adminMessage.className = 'dashboard-message' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');
  }

  function getToken() {
    if (!supabase) return null;
    var session = supabase.auth.getSession();
    return session && session.then ? null : (session && session.data && session.data.session ? session.data.session.access_token : null);
  }

  async function ensureAuth() {
    if (!supabase) return null;
    var { data: { session } } = await supabase.auth.getSession();
    return session ? session.access_token : null;
  }

  if (logoutLink) {
    logoutLink.addEventListener('click', async function (e) {
      e.preventDefault();
      if (supabase) await supabase.auth.signOut();
      window.location.href = '/';
    });
  }

  (function initSidebarToggle() {
    var sidebar = document.getElementById('dashboard-sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    var toggle = document.getElementById('sidebar-toggle');
    if (!sidebar || !overlay || !toggle) return;
    function open() {
      sidebar.classList.add('is-open');
      overlay.classList.add('is-open');
    }
    function close() {
      sidebar.classList.remove('is-open');
      overlay.classList.remove('is-open');
    }
    toggle.addEventListener('click', function () {
      if (sidebar.classList.contains('is-open')) close(); else open();
    });
    overlay.addEventListener('click', close);
    document.querySelectorAll('.dashboard-sidebar__nav-item').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth <= 900) close();
      });
    });
  })();

  function renderTable() {
    if (!tbody) return;
    tbody.innerHTML = features.map(function (f) {
      var id = f.id.replace(/"/g, '&quot;');
      var name = f.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      var status = (f.status || 'online').replace(/"/g, '&quot;');
      return '<tr data-id="' + id + '"><td>' + name + '</td><td><span class="status-badge ' + status + '">' + status.replace('_', ' ') + '</span></td><td><select class="feature-status-select" data-id="' + id + '"><option value="online"' + (status === 'online' ? ' selected' : '') + '>online</option><option value="beta"' + (status === 'beta' ? ' selected' : '') + '>beta</option><option value="coming_soon"' + (status === 'coming_soon' ? ' selected' : '') + '>coming soon</option></select></td></tr>';
    }).join('');
  }

  function setSidebarActive() {
    var hash = (window.location.hash || '#dashboard').replace('#', '') || 'dashboard';
    document.querySelectorAll('.dashboard-sidebar__nav-item').forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var linkHash = (href.split('#')[1] || 'dashboard').trim() || 'dashboard';
      a.classList.toggle('active', linkHash === hash);
    });
  }
  setSidebarActive();
  window.addEventListener('hashchange', setSidebarActive);

  if (saveBtn) saveBtn.addEventListener('click', async function () {
    var token = await ensureAuth();
    if (!token) {
      setStatus('Not logged in.', 'error');
      return;
    }
    var changed = [];
    tbody.querySelectorAll('.feature-status-select').forEach(function (select) {
      var id = select.getAttribute('data-id');
      var newStatus = select.value;
      var f = features.find(function (x) { return x.id === id; });
      if (f && f.status !== newStatus) changed.push({ id: id, status: newStatus });
    });
    if (changed.length === 0) {
      setStatus('No changes to save.');
      return;
    }
    saveBtn.disabled = true;
    setStatus('Saving…');
    var done = 0;
    var err = null;
    for (var i = 0; i < changed.length; i++) {
      var res = await fetch('/api/features/' + encodeURIComponent(changed[i].id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ status: changed[i].status })
      });
      if (!res.ok) err = await res.json().catch(function () { return {}; });
      else {
        var feat = features.find(function (x) { return x.id === changed[i].id; });
        if (feat) feat.status = changed[i].status;
      }
      done++;
    }
    saveBtn.disabled = false;
    if (err) {
      setStatus((err.message || 'Save failed.') + ' (' + done + '/' + changed.length + ' saved)', 'error');
    } else {
      setStatus('Saved. Homepage will show updated status.', 'success');
      renderTable();
    }
  });

  async function load() {
    var token = await ensureAuth();
    if (!token) {
      window.location.href = '/login?next=/admin/dashboard';
      return;
    }
    var meRes = await fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!meRes.ok) {
      window.location.href = '/login?next=/admin/dashboard';
      return;
    }
    var meData = await meRes.json();
    if (!meData.user || meData.user.role !== 'admin') {
      setAdminMessage('Admin access required.', 'error');
      return;
    }
    var fRes = await fetch('/api/features', { headers: { 'Authorization': 'Bearer ' + token } });
    if (!fRes.ok) {
      setAdminMessage('Failed to load features.', 'error');
      return;
    }
    var fData = await fRes.json();
    features = fData.data || [];
    renderTable();
  }

  fetch('/api/config')
    .then(function (r) { return r.json(); })
    .then(function (config) {
      if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
        var createClient = window.supabase.createClient;
        if (createClient) {
          supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
          load();
        } else {
          setAdminMessage('Auth not configured.', 'error');
        }
      } else {
        setAdminMessage('Auth not configured.', 'error');
      }
    })
    .catch(function () {
      setAdminMessage('Failed to load config.', 'error');
    });

  var yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
