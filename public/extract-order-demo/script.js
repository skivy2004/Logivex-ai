// Logivex Email Order Extraction Demo
// Handles form submission, API calls, and result display

document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll fallback for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  const form = document.getElementById('extract-form');
  const emailText = document.getElementById('emailText');
  const extractButton = document.getElementById('extract-button');
  const messageEl = document.getElementById('form-message');
  const footerYear = document.getElementById('footer-year');

  // Set footer year
  if (footerYear) {
    footerYear.textContent = new Date().getFullYear();
  }

  function setMessage(text, type) {
    messageEl.textContent = text;
    messageEl.classList.remove('form-message--success', 'form-message--error');
    if (type === 'success') {
      messageEl.classList.add('form-message--success');
    } else if (type === 'error') {
      messageEl.classList.add('form-message--error');
    }
  }

  function showLoading() {
    extractButton.disabled = true;
    extractButton.classList.add('loading');
    const buttonLabel = extractButton.querySelector('.button-label');
    if (buttonLabel) {
      buttonLabel.textContent = 'Extracting...';
    }
  }

  function hideLoading() {
    extractButton.disabled = false;
    extractButton.classList.remove('loading');
    const buttonLabel = extractButton.querySelector('.button-label');
    if (buttonLabel) {
      buttonLabel.textContent = 'Extract Transport Order';
    }
  }

  function displayResults(data) {
    // Find or create output card
    let outputCard = document.querySelector('.output-card');
    
    if (!outputCard) {
      // Create output card if it doesn't exist
      outputCard = document.createElement('div');
      outputCard.className = 'card output-card';
      outputCard.innerHTML = `
        <header class="card-header">
          <h2>Extracted Transport Order</h2>
          <p>AI-extracted shipment details from your email</p>
        </header>
        <div class="output-fields" id="output-fields">
          <div class="output-field">
            <span class="output-field-label">Pickup Location</span>
            <span class="output-field-value" id="output-pickup">–</span>
          </div>
          <div class="output-field">
            <span class="output-field-label">Delivery Location</span>
            <span class="output-field-value" id="output-delivery">–</span>
          </div>
          <div class="output-field">
            <span class="output-field-label">Number of Pallets</span>
            <span class="output-field-value" id="output-pallets">–</span>
          </div>
          <div class="output-field">
            <span class="output-field-label">Weight</span>
            <span class="output-field-value" id="output-weight">–</span>
          </div>
          <div class="output-field">
            <span class="output-field-label">Pickup Date</span>
            <span class="output-field-value" id="output-date">–</span>
          </div>
        </div>
      `;
      
      // Insert after the input card
      const heroInner = document.querySelector('.hero-inner');
      if (heroInner) {
        // In mobile view, stack vertically
        if (window.innerWidth <= 900) {
          heroInner.appendChild(outputCard);
        } else {
          // In desktop, add as third column or replace demo card
          heroInner.style.gridTemplateColumns = '1fr 1fr 1fr';
          heroInner.appendChild(outputCard);
        }
      }
    }

    // Update the output fields
    const pickupEl = document.getElementById('output-pickup');
    const deliveryEl = document.getElementById('output-delivery');
    const palletsEl = document.getElementById('output-pallets');
    const weightEl = document.getElementById('output-weight');
    const dateEl = document.getElementById('output-date');

    if (pickupEl) {
      pickupEl.textContent = data.pickup || 'Not detected';
      pickupEl.classList.toggle('empty', !data.pickup);
    }
    if (deliveryEl) {
      deliveryEl.textContent = data.delivery || 'Not detected';
      deliveryEl.classList.toggle('empty', !data.delivery);
    }
    if (palletsEl) {
      palletsEl.textContent = data.pallets ? `${data.pallets} pallets` : 'Not detected';
      palletsEl.classList.toggle('empty', !data.pallets);
    }
    if (weightEl) {
      weightEl.textContent = data.weight || 'Not detected';
      weightEl.classList.toggle('empty', !data.weight);
    }
    if (dateEl) {
      dateEl.textContent = data.pickup_date || 'Not detected';
      dateEl.classList.toggle('empty', !data.pickup_date);
    }

    // Remove extracting state
    const cardHeader = outputCard.querySelector('.card-header');
    if (cardHeader) {
      cardHeader.classList.remove('extracting');
    }
  }

  function showPlaceholder() {
    let outputCard = document.querySelector('.output-card');
    
    if (!outputCard) {
      outputCard = document.createElement('div');
      outputCard.className = 'card output-card';
      
      const heroInner = document.querySelector('.hero-inner');
      if (heroInner) {
        if (window.innerWidth > 900) {
          heroInner.style.gridTemplateColumns = '1fr 1fr 1fr';
        }
        heroInner.appendChild(outputCard);
      }
    }

    outputCard.innerHTML = `
      <header class="card-header">
        <h2>Extracted Transport Order</h2>
        <p>AI-extracted shipment details will appear here</p>
      </header>
      <div class="output-placeholder">
        <div class="output-placeholder-icon">📧</div>
        <p class="output-placeholder-text">
          Paste a transport email and click "Extract Transport Order" to see AI extraction in action.
        </p>
      </div>
    `;
  }

  // Show placeholder initially
  showPlaceholder();

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('', null);

    const text = emailText.value.trim();
    if (!text) {
      setMessage('Please paste an email to extract.', 'error');
      return;
    }

    showLoading();

    // Update output card to show extracting state
    const outputCard = document.querySelector('.output-card');
    if (outputCard) {
      const cardHeader = outputCard.querySelector('.card-header');
      if (cardHeader) {
        cardHeader.classList.add('extracting');
        const subtitle = cardHeader.querySelector('p');
        if (subtitle) {
          subtitle.textContent = 'AI is analyzing the email...';
        }
      }
    }

    try {
      console.log('Sending extraction request...');
      
      const response = await fetch('/api/extract-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email_text: text })
      });

      const data = await response.json();
      console.log('Extraction response:', data);

      if (response.ok) {
        displayResults(data);
        setMessage('Transport order extracted successfully!', 'success');
      } else {
        setMessage(data.message || 'Failed to extract order. Please try again.', 'error');
        showPlaceholder();
      }
    } catch (error) {
      console.error('Extraction error:', error);
      setMessage('Network error. Please check your connection and try again.', 'error');
      showPlaceholder();
    } finally {
      hideLoading();
    }
  }

  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
});
