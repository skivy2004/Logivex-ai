document.addEventListener('DOMContentLoaded', () => {
  const gridEl = document.getElementById('demo-grid');
  const featuredNameEl = document.getElementById('featured-name');
  const featuredDescEl = document.getElementById('featured-description');
  const featuredCatEl = document.getElementById('featured-category');
  const featuredBtnEl = document.getElementById('featured-button');
  const yearEl = document.getElementById('footer-year');

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }

  fetch('/demos.json')
    .then(res => res.json())
    .then(data => {
      const demos = Array.isArray(data.demos) ? data.demos : [];
      if (!demos.length) {
        if (gridEl) {
          gridEl.textContent = 'No demos are configured yet. Add demos in demos.js.';
        }
        return;
      }

      // Featured demo – first one for now.
      const featured = demos[0];

      if (featuredNameEl) featuredNameEl.textContent = featured.name;
      if (featuredDescEl) featuredDescEl.textContent = featured.description;
      if (featuredCatEl) featuredCatEl.textContent = featured.category || '';
      if (featuredBtnEl) {
        featuredBtnEl.onclick = () => {
          if (featured.url) {
            window.open(featured.url, '_blank', 'noopener,noreferrer');
          }
        };
      }

      if (!gridEl) return;

      demos.forEach((demo, index) => {
        const card = document.createElement('article');
        // First card is featured (spans 2 columns)
        card.className = index === 0 ? 'bento-card featured' : 'bento-card';

        const content = document.createElement('div');
        content.className = 'bento-card-content';

        // Badge (only for featured or special demos)
        if (index === 0) {
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

        const category = document.createElement('span');
        category.className = 'bento-card-category';
        category.textContent = demo.category || '';

        const button = document.createElement('button');
        button.className = 'bento-btn';
        button.textContent = 'Open demo';
        button.type = 'button';
        button.onclick = () => {
          if (demo.url) {
            window.open(demo.url, '_blank', 'noopener,noreferrer');
          }
        };

        footer.appendChild(category);
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

