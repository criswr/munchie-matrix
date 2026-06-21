/* ============================================================
   MUNCHIE MATRIX — app.js
   Fetches data.json and renders snack/drink sections
   ============================================================ */

const SECTION_META = {
  snacks: { label: 'Snacks', icon: '🍿' },
  drinks: { label: 'Drinks', icon: '🧃' },
};

// Stagger delay between items (ms)
const STAGGER_MS = 80;
// Base delay before first item animates in
const BASE_DELAY_MS = 350;

/**
 * Build the chevron SVG icon
 */
function chevronSVG() {
  return `
    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

/**
 * Toggle open/closed state of an item
 * @param {HTMLElement} item - the <li> element
 */
function toggleItem(item) {
  const isOpen = item.classList.contains('open');

  // Close all other open items in the same list
  const siblings = item.closest('.item-list').querySelectorAll('.item.open');
  siblings.forEach((sib) => {
    if (sib !== item) sib.classList.remove('open');
  });

  item.classList.toggle('open', !isOpen);

  // Announce for screen readers
  const button = item.querySelector('.item-title');
  button.setAttribute('aria-expanded', String(!isOpen));
}

/**
 * Render a single item <li>
 * @param {{ title: string, description: string }} itemData
 * @param {number} index - used for stagger delay
 * @returns {HTMLLIElement}
 */
function createItemEl(itemData, index) {
  const li = document.createElement('li');
  li.className = 'item';
  li.id = `item-${itemData.title.toLowerCase().replace(/\s+/g, '-')}`;

  // Stagger animation delay
  const delay = BASE_DELAY_MS + index * STAGGER_MS;
  li.style.animationDelay = `${delay}ms`;

  li.innerHTML = `
    <button class="item-title" aria-expanded="false" aria-controls="desc-${li.id}">
      <span class="item-title-text">${itemData.title}</span>
      <span class="item-chevron">${chevronSVG()}</span>
    </button>
    <div class="item-description" id="desc-${li.id}" role="region">
      <div class="item-description-inner">${itemData.description}</div>
    </div>
  `;

  li.querySelector('.item-title').addEventListener('click', () => toggleItem(li));

  return li;
}

/**
 * Render a full section (snacks or drinks)
 * @param {string} key - 'snacks' | 'drinks'
 * @param {Array} items
 * @param {number} sectionIndex - used to offset stagger per section
 * @returns {HTMLElement}
 */
function createSectionEl(key, items, sectionIndex) {
  const meta = SECTION_META[key] || { label: key, icon: '•' };
  const itemOffset = sectionIndex * 10; // keep delays distinct across sections

  const section = document.createElement('section');
  section.className = 'munchie-section';
  section.setAttribute('aria-label', meta.label);

  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <span class="section-icon" aria-hidden="true">${meta.icon}</span>
    <h2 class="section-title">${meta.label}</h2>
    <div class="section-line" aria-hidden="true"></div>
  `;

  const ul = document.createElement('ul');
  ul.className = 'item-list';

  items.forEach((itemData, idx) => {
    ul.appendChild(createItemEl(itemData, itemOffset + idx));
  });

  section.appendChild(header);
  section.appendChild(ul);
  return section;
}

/**
 * Main render function
 * @param {Object} data - parsed JSON from data.json
 */
function render(data) {
  const app = document.getElementById('app');

  // Remove loading state
  const loading = document.getElementById('loading');
  if (loading) loading.remove();

  const sectionOrder = ['snacks', 'drinks'];
  sectionOrder.forEach((key, sectionIndex) => {
    if (data[key] && data[key].length > 0) {
      const sorted = [...data[key]].sort((a, b) =>
        a.title.localeCompare(b.title)
      );
      app.appendChild(createSectionEl(key, sorted, sectionIndex));
    }
  });
}

/**
 * Show error state
 * @param {string} message
 */
function showError(message) {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = `
      <span style="font-size:2rem">😕</span>
      <span style="color:#e8f0ef">${message}</span>
      <span style="font-size:0.8rem;color:#5a7a78">Check that data.json is accessible.</span>
    `;
  }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  fetch('data.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => render(data))
    .catch((err) => {
      console.error('Munchie Matrix: failed to load data.json', err);
      showError('Couldn\'t load the munchie list.');
    });
});
