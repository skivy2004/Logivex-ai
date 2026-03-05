document.addEventListener('DOMContentLoaded', () => {
  const gridEl = document.getElementById('demo-grid');
  const featuredNameEl = document.getElementById('featured-name');
  const featuredDescEl = document.getElementById('featured-description');
  const featuredCatEl = document.getElementById('featured-category');
  const featuredBtnEl = document.getElementById('featured-button');
  const yearEl = document.getElementById('dh-year');

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

      demos.forEach(demo => {
        const card = document.createElement('article');
        card.className = 'dh-card';

        const title = document.createElement('h3');
        title.className = 'dh-card-title';
        title.textContent = demo.name;

        const desc = document.createElement('p');
        desc.className = 'dh-card-description';
        desc.textContent = demo.description;

        const footer = document.createElement('div');
        footer.className = 'dh-card-footer';

        const category = document.createElement('span');
        category.className = 'dh-card-category';
        category.textContent = demo.category || '';

        const button = document.createElement('button');
        button.className = 'dh-btn dh-btn-outline';
        button.textContent = 'Open demo';
        button.type = 'button';
        button.onclick = () => {
          if (demo.url) {
            window.open(demo.url, '_blank', 'noopener,noreferrer');
          }
        };

        footer.appendChild(category);
        footer.appendChild(button);

        card.appendChild(title);
        card.appendChild(desc);
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

