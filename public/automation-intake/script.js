(function () {
  'use strict';

  function getQueryParams() {
    var params = {};
    var search = window.location.search;
    if (!search) return params;
    var pairs = search.slice(1).split('&');
    for (var i = 0; i < pairs.length; i++) {
      var parts = pairs[i].split('=');
      var key = decodeURIComponent(parts[0] || '');
      var val = decodeURIComponent((parts[1] || '').replace(/\+/g, ' '));
      if (key) params[key] = val;
    }
    return params;
  }

  function getQuestionsFromParams(params) {
    var questions = [];
    var keys = Object.keys(params).filter(function (k) { return /^q\d+$/.test(k); });
    keys.sort(function (a, b) {
      var nA = parseInt(a.slice(1), 10);
      var nB = parseInt(b.slice(1), 10);
      return (nA - nB);
    });
    keys.forEach(function (key) {
      questions.push({ key: key, text: params[key] || key });
    });
    return questions;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  var formWrap = document.getElementById('intake-form-wrap');
  var form = document.getElementById('intake-form');
  var questionsEl = document.getElementById('intake-questions');
  var successEl = document.getElementById('intake-success');
  var statusEl = document.getElementById('intake-status');
  var submitBtn = document.getElementById('intake-submit');

  var params = getQueryParams();
  var prefillName = params.name || '';
  var prefillCompany = params.company || '';
  var prefillEmail = params.email || '';
  var questions = getQuestionsFromParams(params);

  // Prefill
  var nameInput = document.getElementById('intake-name');
  var companyInput = document.getElementById('intake-company');
  var emailInput = document.getElementById('intake-email');
  if (nameInput) nameInput.value = prefillName;
  if (companyInput) companyInput.value = prefillCompany;
  if (emailInput) emailInput.value = prefillEmail;

  // Render dynamic questions
  if (questionsEl && questions.length > 0) {
    questionsEl.innerHTML = questions.map(function (q) {
      var id = 'intake-' + q.key;
      return '<div class="intake-field"><label for="' + escapeHtml(id) + '">' + escapeHtml(q.text) + '</label><input type="text" id="' + escapeHtml(id) + '" name="' + escapeHtml(q.key) + '" /></div>';
    }).join('');
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!submitBtn || !statusEl || !formWrap || !successEl) return;

      var name = (nameInput && nameInput.value) ? nameInput.value.trim() : '';
      var email = (emailInput && emailInput.value) ? emailInput.value.trim() : '';
      var company = (companyInput && companyInput.value) ? companyInput.value.trim() : '';

      if (!name || !email) {
        statusEl.textContent = 'Please enter your name and email.';
        statusEl.className = 'intake-status error';
        return;
      }

      var answers = {};
      questions.forEach(function (q) {
        var el = document.getElementById('intake-' + q.key);
        if (el) answers[q.key] = (el.value && el.value.trim()) ? el.value.trim() : '';
      });
      // Also collect any other q* inputs that might have been added
      var inputs = form.querySelectorAll('input[name^="q"]');
      for (var i = 0; i < inputs.length; i++) {
        var nameAttr = inputs[i].getAttribute('name');
        if (nameAttr && /^q\d+$/.test(nameAttr) && !answers[nameAttr]) {
          answers[nameAttr] = (inputs[i].value && inputs[i].value.trim()) ? inputs[i].value.trim() : '';
        }
      }

      submitBtn.disabled = true;
      statusEl.textContent = 'Submitting…';
      statusEl.className = 'intake-status';

      fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, company: company, answers: answers })
      })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (result) {
          if (result.ok && result.data.success) {
            formWrap.setAttribute('hidden', '');
            successEl.removeAttribute('hidden');
            if (statusEl) {
              statusEl.textContent = '';
              statusEl.className = 'intake-status';
            }
          } else {
            statusEl.textContent = (result.data && result.data.message) || 'Something went wrong. Please try again.';
            statusEl.className = 'intake-status error';
            submitBtn.disabled = false;
          }
        })
        .catch(function () {
          statusEl.textContent = 'Network error. Please try again.';
          statusEl.className = 'intake-status error';
          submitBtn.disabled = false;
        });
    });
  }

  var yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
