document.addEventListener('DOMContentLoaded', () => {
  // Header: show on scroll down, hide at top
  const siteHeader = document.querySelector('.site-header');
  const SCROLL_THRESHOLD = 10;

  function updateHeaderVisibility() {
    if (!siteHeader) return;
    if (window.scrollY > SCROLL_THRESHOLD) {
      siteHeader.classList.add('header-visible');
    } else {
      siteHeader.classList.remove('header-visible');
    }
  }

  window.addEventListener('scroll', updateHeaderVisibility, { passive: true });
  updateHeaderVisibility(); // set initial state

  // Smooth scroll fallback for anchor links (except Contact – opens modal)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    const href = anchor.getAttribute('href') || '';
    if (href === '#contact' || href.endsWith('#contact')) return;
    anchor.addEventListener('click', function (e) {
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

  const gridEl = document.getElementById('demo-grid');
  const yearEl = document.getElementById('footer-year');

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }

  fetch('/api/demos')
    .then(res => {
      if (!res.ok) throw new Error('API returned ' + res.status);
      return res.json();
    })
    .then(data => {
      const demos = Array.isArray(data.demos) ? data.demos : (Array.isArray(data) ? data : []);
      if (!demos.length) {
        if (gridEl) {
          gridEl.textContent = 'No demos are configured yet.';
        }
        return;
      }

      if (!gridEl) return;

      demos.forEach((demo) => {
        const card = document.createElement('article');
        card.className = 'bento-card';

        const content = document.createElement('div');
        content.className = 'bento-card-content';

        const title = document.createElement('h3');
        title.textContent = demo.name;

        const desc = document.createElement('p');
        desc.textContent = demo.description;

        content.appendChild(title);
        content.appendChild(desc);

        const footer = document.createElement('div');
        footer.className = 'bento-card-footer';

        // Status indicator
        const status = document.createElement('span');
        status.className = `demo-status ${demo.status || 'offline'}`;
        status.textContent = demo.status ? demo.status.replace('_', ' ') : 'offline';

        const button = document.createElement('button');
        button.className = 'bento-btn';
        button.textContent = demo.status === 'coming_soon' ? 'Soon' : (demo.status === 'offline' ? 'Unavailable' : 'Launch Demo →');
        button.type = 'button';
        button.disabled = demo.status === 'coming_soon' || demo.status === 'offline';
        
        if (demo.status !== 'coming_soon' && demo.status !== 'offline') {
          button.onclick = () => {
            if (demo.url) {
              window.location.href = demo.url;
            }
          };
        }

        footer.appendChild(status);
        footer.appendChild(button);

        card.appendChild(content);
        card.appendChild(footer);

        gridEl.appendChild(card);
      });
    })
    .catch(err => {
      console.error('Failed to load demos:', err);
      if (gridEl) {
        gridEl.textContent = 'Unable to load demos. Please try again later.';
      }
    });
});

