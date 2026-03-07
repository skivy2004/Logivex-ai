/**
 * Global contact modal: one instance in the DOM, works on every page.
 * Inject modal if missing, delegate [data-contact-open] and contact links, handle open/close/submit/admin autofill.
 */
(function () {
  'use strict';

  var CONTACT_MODAL_HTML =
    '<div class="contact-modal-overlay" id="contact-modal" aria-hidden="true" hidden>' +
      '<div class="contact-modal-card" role="dialog" aria-labelledby="contact-modal-title" aria-modal="true">' +
        '<button type="button" class="contact-modal-close-x" id="contact-modal-close-x" aria-label="Close modal">&times;</button>' +
        '<div class="contact-modal-container">' +
          '<div class="contact-modal-left">' +
            '<h2 id="contact-modal-title" class="contact-modal-title">Get in Touch</h2>' +
            '<p class="contact-modal-desc">We\'re here to help automate your logistics operations.</p>' +
            '<ul class="contact-modal-info" aria-label="Contact information">' +
              '<li><span class="contact-modal-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></span><a href="mailto:info@logivex.com">info@logivex.com</a></li>' +
              '<li><span class="contact-modal-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span><span>+31 6 14862977</span></li>' +
              '<li><span class="contact-modal-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span><span>Enschede, Netherlands</span></li>' +
            '</ul>' +
          '</div>' +
          '<div class="contact-modal-right">' +
            '<form class="contact-modal-form" id="contact-form">' +
              '<label for="contact-name">Name</label><input type="text" id="contact-name" name="name" required autocomplete="name" />' +
              '<label for="contact-email">Email</label><input type="email" id="contact-email" name="email" required autocomplete="email" />' +
              '<label for="contact-company">Company</label><input type="text" id="contact-company" name="company" autocomplete="organization" />' +
              '<label for="contact-message">Message</label><textarea id="contact-message" name="message" rows="4" required placeholder="How can we help?"></textarea>' +
              '<p id="contact-form-status" class="contact-form-status" role="status" aria-live="polite"></p>' +
              '<div class="contact-modal-actions">' +
                '<button type="button" id="admin-autofill" class="admin-autofill-btn" style="display: none;">Auto Fill (Admin)</button>' +
                '<button type="submit" class="btn btn-primary" id="contact-submit-btn">Send Message</button>' +
              '</div>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  function ensureModalInDom() {
    if (document.getElementById('contact-modal')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = CONTACT_MODAL_HTML.trim();
    var modal = wrap.firstChild;
    if (modal) document.body.appendChild(modal);
  }

  function openContactModal() {
    var contactModal = document.getElementById('contact-modal');
    if (!contactModal) return;
    contactModal.removeAttribute('hidden');
    contactModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      contactModal.classList.add('is-open');
    });
  }

  function closeContactModal() {
    var contactModal = document.getElementById('contact-modal');
    if (!contactModal) return;
    contactModal.classList.remove('is-open');
    function onEnd() {
      contactModal.setAttribute('hidden', '');
      contactModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      contactModal.removeEventListener('transitionend', onEnd);
    }
    contactModal.addEventListener('transitionend', onEnd);
  }

  function bindContactModal() {
    ensureModalInDom();
    var contactModal = document.getElementById('contact-modal');
    var contactForm = document.getElementById('contact-form');
    var contactCloseX = document.getElementById('contact-modal-close-x');

    if (contactCloseX) {
      contactCloseX.addEventListener('click', closeContactModal);
    }
    if (contactModal) {
      contactModal.addEventListener('click', function (e) {
        if (e.target === contactModal) closeContactModal();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && contactModal && contactModal.classList.contains('is-open')) {
        closeContactModal();
      }
    });

    if (contactForm) {
      var submitBtn = document.getElementById('contact-submit-btn');
      var statusEl = document.getElementById('contact-form-status');
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!submitBtn || !statusEl) return;
        var name = (document.getElementById('contact-name') && document.getElementById('contact-name').value) || '';
        var email = (document.getElementById('contact-email') && document.getElementById('contact-email').value) || '';
        var company = (document.getElementById('contact-company') && document.getElementById('contact-company').value) || '';
        var message = (document.getElementById('contact-message') && document.getElementById('contact-message').value) || '';
        submitBtn.disabled = true;
        statusEl.textContent = 'Sending…';
        statusEl.className = 'contact-form-status';
        fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, email: email, company: company, message: message })
        })
          .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
          .then(function (res) {
            if (res.ok && res.data.success) {
              statusEl.textContent = res.data.message || 'Message sent. We\'ll get back to you soon.';
              statusEl.className = 'contact-form-status success';
              contactForm.reset();
              setTimeout(function () {
                closeContactModal();
                statusEl.textContent = '';
                statusEl.className = 'contact-form-status';
                if (submitBtn) submitBtn.disabled = false;
              }, 1500);
            } else {
              statusEl.textContent = (res.data && res.data.message) || 'Something went wrong. Please try again.';
              statusEl.className = 'contact-form-status error';
              if (submitBtn) submitBtn.disabled = false;
            }
          })
          .catch(function () {
            statusEl.textContent = 'Network error. Please try again.';
            statusEl.className = 'contact-form-status error';
            if (submitBtn) submitBtn.disabled = false;
          });
      });
    }

    var adminAutofillBtn = document.getElementById('admin-autofill');
    if (adminAutofillBtn) {
      var DEMO_DATA = {
        name: 'Logivex Demo Client',
        company: 'Demo Logistics BV',
        message: 'Hello Logivex team,\n\nWe are exploring automation for our transport quoting workflow and would like to learn how your AI automation platform could help streamline our logistics operations.\n\nWe currently process many quote requests via email and manually calculate rates.\n\nLooking forward to hearing more about how Logivex could support this.\n\nBest regards,\nDemo Logistics'
      };
      function applyAdminAutofill(userEmail) {
        var nameEl = document.getElementById('contact-name');
        var emailEl = document.getElementById('contact-email');
        var companyEl = document.getElementById('contact-company');
        var messageEl = document.getElementById('contact-message');
        if (nameEl) nameEl.value = DEMO_DATA.name;
        if (emailEl) emailEl.value = userEmail || '';
        if (companyEl) companyEl.value = DEMO_DATA.company;
        if (messageEl) messageEl.value = DEMO_DATA.message;
      }
      adminAutofillBtn.addEventListener('click', function () {
        if (window.__contactAdminAutofillEmail) applyAdminAutofill(window.__contactAdminAutofillEmail);
      });
      fetch('/api/config')
        .then(function (r) { return r.json(); })
        .then(function (config) {
          if (!config.supabaseUrl || !config.supabaseAnonKey || !window.supabase || !window.supabase.createClient) return null;
          var supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
          return supabase.auth.getSession().then(function (ref) {
            var data = ref.data;
            return { session: data && data.session };
          });
        })
        .then(function (result) {
          if (!result || !result.session) return null;
          var token = result.session.access_token;
          return fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) { return { data: data, session: result.session }; });
        })
        .then(function (result) {
          if (!result || !result.data || !result.data.user) return;
          var role = result.data.user.role;
          var isAdmin = role === 'admin' || (result.session.user && result.session.user.user_metadata && result.session.user.user_metadata.role === 'admin');
          if (!isAdmin) return;
          adminAutofillBtn.style.display = 'inline-flex';
          adminAutofillBtn.classList.add('btn', 'btn-secondary');
          window.__contactAdminAutofillEmail = result.session.user.email || '';
        })
        .catch(function () {});
    }
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-contact-open], a[href="#contact"], a[href="/#contact"]');
    if (trigger) {
      e.preventDefault();
      openContactModal();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      bindContactModal();
      if (window.location.hash === '#contact') openContactModal();
    });
  } else {
    bindContactModal();
    if (window.location.hash === '#contact') openContactModal();
  }
  window.addEventListener('hashchange', function () {
    if (window.location.hash === '#contact') openContactModal();
  });

  window.openContactModal = openContactModal;
  window.closeContactModal = closeContactModal;
})();
