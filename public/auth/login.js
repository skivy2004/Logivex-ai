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
      if (config.supabaseUrl && config.supabaseAnonKey && window.supabase) {
        var createClient = window.supabase.createClient;
        if (createClient) supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
      }
    })
    .catch(function () {});

  var yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
