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

  // Smooth scroll for buttons with data-scroll-target
  document.querySelectorAll('[data-scroll-target]').forEach(button => {
    button.addEventListener('click', function () {
      const targetId = this.getAttribute('data-scroll-target');
      const target = document.querySelector(targetId);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  const gridEl = document.getElementById('demo-grid');
  const featuredNameEl = document.getElementById('featured-name');
  const featuredDescEl = document.getElementById('featured-description');
  const featuredCatEl = document.getElementById('featured-category');
  const featuredBtnEl = document.getElementById('featured-button');
  const yearEl = document.getElementById('footer-year');

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }

  fetch('/api/demos')
    .then(res => res.json())
    .then(data => {
      const demos = Array.isArray(data.demos) ? data.demos : [];
      if (!demos.length) {
        if (gridEl) {
          gridEl.textContent = 'No demos are configured yet. Add demos in demos.js.';
        }
        return;
      }

      // Filter only online/beta demos for featured section
      const availableDemos = demos.filter(d => d.status === 'online' || d.status === 'beta');
      const featured = availableDemos[0] || demos[0];

      if (featuredNameEl) featuredNameEl.textContent = featured.name;
      if (featuredDescEl) featuredDescEl.textContent = featured.description;
      if (featuredCatEl) featuredCatEl.textContent = featured.category || '';
      if (featuredBtnEl) {
        featuredBtnEl.onclick = () => {
          if (featured.url) {
            window.location.href = featured.url;
          }
        };
      }

      if (!gridEl) return;

      demos.forEach((demo, index) => {
        const card = document.createElement('article');
        // First available card is featured (spans 2 columns)
        const isFeatured = demo.id === featured.id;
        card.className = isFeatured ? 'bento-card featured' : 'bento-card';

        const content = document.createElement('div');
        content.className = 'bento-card-content';

        // Badge (only for featured or special demos)
        if (isFeatured) {
          const badge = document.createElement('span');
          badge.className = 'bento-card-badge';
          badge.textContent = 'Featured';
          content.appendChild(badge);
        }

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
        button.textContent = demo.status === 'coming_soon' ? 'Soon' : (demo.status === 'offline' ? 'Unavailable' : 'Open demo');
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

