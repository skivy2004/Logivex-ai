(function () {
  const EXAMPLE_MESSAGE = `Hello,

My name is Mark Jansen from Rotterdam Logistics.

We are interested in your automation platform for our transport operations.

We currently manage about 40 trucks and receive around 200 quote requests per day.

Please contact me.

Mark`;

  const STEP_IDS = ['step-ai', 'step-lead', 'step-crm', 'step-sales'];
  const STEP_DURATION_MS = 500;

  const messageInput = document.getElementById('message-input');
  const analyzeBtn = document.getElementById('analyze-btn');
  const formMessage = document.getElementById('form-message');
  const resultSection = document.getElementById('result-section');
  const leadCard = document.getElementById('lead-card');
  const exampleBtn = document.getElementById('example-btn');
  const clearBtn = document.getElementById('clear-btn');
  const automationSteps = document.getElementById('automation-steps');
  const recentLeadsEmpty = document.getElementById('recent-leads-empty');
  const recentLeadsList = document.getElementById('recent-leads-list');

  function setMessage(text, type) {
    formMessage.textContent = text || '';
    formMessage.className = 'form-message' + (type === 'success' ? ' form-message--success' : type === 'error' ? ' form-message--error' : '');
  }

  function setLoading(loading) {
    if (!analyzeBtn) return;
    analyzeBtn.disabled = loading;
    if (loading) {
      analyzeBtn.classList.add('loading');
      analyzeBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Analyzing…';
    } else {
      analyzeBtn.classList.remove('loading');
      analyzeBtn.innerHTML = 'Analyze Lead';
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

  function runAutomationAnimation() {
    return new Promise((resolve) => {
      if (!automationSteps) {
        resolve();
        return;
      }
      automationSteps.hidden = false;
      const steps = STEP_IDS.map((id) => document.getElementById(id)).filter(Boolean);

      steps.forEach((el) => {
        el.classList.remove('active', 'done');
      });

      let index = 0;
      function next() {
        if (index > 0 && steps[index - 1]) {
          steps[index - 1].classList.remove('active');
          steps[index - 1].classList.add('done');
        }
        if (index < steps.length) {
          steps[index].classList.add('active');
          index++;
          setTimeout(next, STEP_DURATION_MS);
        } else {
          if (steps[steps.length - 1]) {
            steps[steps.length - 1].classList.remove('active');
            steps[steps.length - 1].classList.add('done');
          }
          setTimeout(resolve, STEP_DURATION_MS);
        }
      }
      next();
    });
  }

  function hideAutomation() {
    if (automationSteps) automationSteps.hidden = true;
  }

  function classificationClass(classification) {
    const c = (classification || '').toLowerCase();
    if (c === 'hot') return 'hot';
    if (c === 'warm') return 'warm';
    return 'cold';
  }

  function renderLeadCard(data) {
    if (!leadCard) return;
    const d = data || {};
    const classification = d.lead_classification || 'Cold';
    const badgeClass = classificationClass(classification);

    leadCard.innerHTML = `
      <div class="lead-card-row">
        <span class="lead-card-label">Name</span>
        <span class="lead-card-value">${displayValue(d.name)}</span>
      </div>
      <div class="lead-card-row">
        <span class="lead-card-label">Company</span>
        <span class="lead-card-value">${displayValue(d.company)}</span>
      </div>
      <div class="lead-card-row">
        <span class="lead-card-label">Industry</span>
        <span class="lead-card-value">${displayValue(d.industry)}</span>
      </div>
      <div class="lead-card-row">
        <span class="lead-card-label">Location</span>
        <span class="lead-card-value">${displayValue(d.location)}</span>
      </div>
      <div class="lead-card-row">
        <span class="lead-card-label">Lead Priority</span>
        <span class="lead-card-value"><span class="lead-priority-badge ${badgeClass}">${escapeHtml(classification)} Lead</span></span>
      </div>
      <div class="lead-card-row">
        <span class="lead-card-label">Intent</span>
        <span class="lead-card-value">${displayValue(d.lead_intent)}</span>
      </div>
    `;
  }

  function showResult(data) {
    if (!resultSection || !leadCard) return;
    renderLeadCard(data);
    resultSection.hidden = false;
    resultSection.classList.add('result-visible');
  }

  function loadRecentLeads() {
    fetch('/api/leads?limit=10')
      .then((r) => r.json())
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        if (!recentLeadsList || !recentLeadsEmpty) return;
        recentLeadsEmpty.hidden = list.length > 0;
        recentLeadsList.hidden = list.length === 0;
        recentLeadsList.innerHTML = list
          .map(
            (lead) =>
              `<li><span class="recent-lead-name">${escapeHtml(lead.name)}</span> — <span class="recent-lead-company">${escapeHtml(lead.company)}</span> <span class="recent-lead-badge ${classificationClass(lead.lead_classification)}">${escapeHtml(lead.lead_classification)}</span></li>`
          )
          .join('');
      })
      .catch(() => {});
  }

  function fillExample() {
    if (messageInput) {
      messageInput.value = EXAMPLE_MESSAGE;
      messageInput.focus();
      setMessage('Example message loaded. Click Analyze Lead to try.', 'success');
      resultSection && (resultSection.hidden = true);
    }
  }

  function clearForm() {
    if (messageInput) messageInput.value = '';
    setMessage('');
    if (resultSection) resultSection.hidden = true;
    hideAutomation();
    if (messageInput) messageInput.focus();
  }

  async function handleAnalyze() {
    const text = messageInput && messageInput.value ? messageInput.value.trim() : '';
    if (!text) {
      setMessage('Please paste a message to analyze.', 'error');
      return;
    }

    setMessage('');
    resultSection && (resultSection.hidden = true);
    setLoading(true);

    const animationPromise = runAutomationAnimation();
    let response;
    let data;
    try {
      response = await fetch('/api/create-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      data = await response.json().catch(() => ({}));
    } catch (err) {
      console.error('Create-lead error:', err);
      hideAutomation();
      setMessage('Network error. Please check your connection and try again.', 'error');
      setLoading(false);
      return;
    }

    if (!response.ok || data.success === false) {
      hideAutomation();
      setMessage(data.message || data.error || 'Analysis failed. Please try again.', 'error');
      setLoading(false);
      return;
    }

    await animationPromise;
    hideAutomation();
    const payload = data.data || data;
    showResult(payload);
    loadRecentLeads();
    setMessage('Lead created and added to CRM.', 'success');
    setLoading(false);
  }

  if (analyzeBtn && messageInput) analyzeBtn.addEventListener('click', handleAnalyze);
  if (exampleBtn) exampleBtn.addEventListener('click', fillExample);
  if (clearBtn) clearBtn.addEventListener('click', clearForm);

  loadRecentLeads();
})();
