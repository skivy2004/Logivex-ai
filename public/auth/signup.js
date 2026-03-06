(function () {
  'use strict';

  var form = document.getElementById('signup-form');
  var messageEl = document.getElementById('form-message');
  var submitBtn = document.getElementById('submit-btn');
  var supabase = null;

  if (!form || !submitBtn) return;

  function setMessage(text, type) {
    messageEl.textContent = text || '';
    messageEl.className = 'form-message' + (type === 'error' ? ' error' : type === 'success' ? ' success' : '');
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? 'Creating account…' : 'Sign up';
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    e.stopPropagation();
    var name = document.getElementById('name').value.trim();
    var email = document.getElementById('email').value.trim();
    var password = document.getElementById('password').value;
    var confirmPassword = document.getElementById('confirm-password').value;

    if (!name) {
      setMessage('Please enter your name.', 'error');
      return;
    }
    if (!email) {
      setMessage('Please enter your email.', 'error');
      return;
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.', 'error');
      return;
    }
    if (!supabase) {
      setMessage('Auth not configured. Please try again later.', 'error');
      return;
    }

    setMessage('');
    setLoading(true);

    try {
      var { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) {
        setMessage(error.message || 'Sign up failed.', 'error');
        setLoading(false);
        return;
      }
      var token = data.session && data.session.access_token;
      if (token) {
        var profileRes = await fetch('/api/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ name: name })
        });
        if (!profileRes.ok) {
          var errData = await profileRes.json().catch(function () { return {}; });
          setMessage(errData.message || 'Account created but profile save failed. You can log in and update your name.', 'error');
        }
      } else {
        setMessage('Account created. Please check your email to confirm, then log in.', 'success');
      }
      setLoading(false);
      if (token) {
        window.location.href = '/';
      }
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
