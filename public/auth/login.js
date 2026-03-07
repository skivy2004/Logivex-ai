(function () {
  'use strict';

  var form = document.getElementById('login-form');
  var messageEl = document.getElementById('form-message');
  var submitBtn = document.getElementById('submit-btn');
  var supabase = null;

  function setMessage(text, type) {
    messageEl.textContent = text || '';
    messageEl.className = 'form-message' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? 'Signing in…' : 'Log in';
  }

  function getRedirectUrl(user) {
    return user && user.role === 'admin' ? '/admin/dashboard' : '/';
  }

  function normalizeConfigValue(value) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/^['"]|['"]$/g, '').trim();
  }

  function initSupabaseFromConfig(config) {
    var supabaseUrl = normalizeConfigValue(config && config.supabaseUrl);
    var supabaseAnonKey = normalizeConfigValue(config && config.supabaseAnonKey);

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Login config missing Supabase values:', config);
      setMessage('Supabase auth keys are missing from /api/config.', 'error');
      return;
    }

    if (!/^https?:\/\//i.test(supabaseUrl)) {
      console.error('Login config has invalid Supabase URL:', supabaseUrl);
      setMessage('Supabase URL is invalid. It must start with https://', 'error');
      return;
    }

    if (!window.supabase || !window.supabase.createClient) {
      console.error('Supabase browser SDK not loaded.');
      setMessage('Supabase browser SDK failed to load.', 'error');
      return;
    }

    var createClient = window.supabase.createClient;
    if (!createClient) {
      setMessage('Supabase client factory is unavailable.', 'error');
      return;
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    if (!email || !password) {
      setMessage('Please enter email and password.', 'error');
      return;
    }
    if (!supabase) {
      setMessage('Auth not configured. Please try again later.', 'error');
      return;
    }

    setMessage('');
    setLoading(true);

    try {
      var { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message || 'Login failed.', 'error');
        setLoading(false);
        return;
      }
      var token = data.session && data.session.access_token;
      if (!token) {
        setMessage('Login failed. No session.', 'error');
        setLoading(false);
        return;
      }
      var meRes = await fetch('/api/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      var meData = meRes.ok ? await meRes.json() : null;
      var user = meData && meData.user ? meData.user : { role: 'user' };
      window.location.href = getRedirectUrl(user);
    } catch (err) {
      setMessage(err.message || 'Something went wrong.', 'error');
      setLoading(false);
    }
  });

  fetch('/api/config')
    .then(function (r) { return r.json(); })
    .then(function (config) {
      initSupabaseFromConfig(config);
    })
    .catch(function (err) {
      console.error('Failed to load /api/config for login:', err);
      setMessage('Failed to load authentication configuration.', 'error');
    });

  var yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
