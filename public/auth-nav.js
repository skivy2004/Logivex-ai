(function () {
  'use strict';

  var authEl = document.getElementById('auth-nav');
  if (!authEl) return;

  var authClient = null;

  function setLinks(html) {
    authEl.innerHTML = html;
    var logout = document.getElementById('auth-logout');
    if (logout && authClient) {
      logout.addEventListener('click', function (e) {
        e.preventDefault();
        authClient.auth.signOut().then(function () { window.location.href = '/'; });
      });
    }
  }

  fetch('/api/config')
    .then(function (r) { return r.json(); })
    .then(function (config) {
      if (!config.supabaseUrl || !config.supabaseAnonKey || !window.supabase || !window.supabase.createClient) {
        setLinks('');
        return;
      }
      authClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      authClient.auth.getSession().then(function (_ref) {
        var data = _ref.data;
        var session = data && data.session;
        if (!session || !session.access_token) {
          setLinks('<a href="/login">Log in</a><a href="/signup">Sign up</a>');
          return;
        }
        fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + session.access_token } })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (data) {
            var user = data && data.user;
            if (user && user.role === 'admin') {
              setLinks('<a href="/admin/dashboard">Admin</a><a href="#" id="auth-logout" class="nav-cta">Log out</a>');
            } else {
              setLinks('<a href="#" id="auth-logout" class="nav-cta">Log out</a>');
            }
          })
          .catch(function () {
            setLinks('<a href="/login">Log in</a><a href="/signup">Sign up</a>');
          });
      }).catch(function () {
        setLinks('<a href="/login">Log in</a><a href="/signup">Sign up</a>');
      });
    })
    .catch(function () {
      setLinks('');
    });
})();
