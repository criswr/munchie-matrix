/* ============================================================
   MUNCHIE MATRIX — app.js
   Data source: Google Sheets (public CSV export)
   ============================================================ */

// ── Config ── Edit these two things if the sheet ever changes
const SPREADSHEET_ID = '1-xUGDJPCugd_lPWpLWInP3Y5lTJdIm1FYUAQWjeu79Y';

const SECTIONS = [
  { key: 'snacks',      sheetName: 'Snacks',            label: 'Snacks',             icon: '🍿' },
  { key: 'cold_drinks', sheetName: 'Bebidas frias',     label: 'Bebidas frías',      icon: '🥶' },
  { key: 'hot_drinks',  sheetName: 'Bebidas calientes', label: 'Bebidas calientes',  icon: '☕️' },
];

// Stagger delay between items (ms)
const STAGGER_MS = 80;
// Base delay before first item animates in
const BASE_DELAY_MS = 350;

// ── Sheets CSV helpers ──────────────────────────────────────

/**
 * Build the public CSV export URL for a given sheet tab
 * @param {string} sheetName
 */
function sheetUrl(sheetName) {
  return (
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}` +
    `/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
  );
}

/**
 * Parse a single CSV row, respecting quoted fields
 * @param {string} line
 * @returns {string[]}
 */
function parseCSVRow(line) {
  const cols = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Escaped quote inside a quoted field
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());
  return cols;
}

/**
 * Parse CSV text into item objects.
 * Expects columns: title, description, active
 * Only returns rows where active = TRUE (case-insensitive)
 * @param {string} text - raw CSV string
 * @returns {{ title: string, description: string }[]}
 */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]).map((h) => h.toLowerCase());
  const titleIdx = headers.indexOf('title');
  const descIdx  = headers.indexOf('description');
  const activeIdx = headers.indexOf('active');

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);

    // Skip inactive rows (if active column exists and value isn't TRUE)
    if (activeIdx >= 0) {
      const activeVal = (cols[activeIdx] || '').toUpperCase();
      if (activeVal !== 'TRUE') continue;
    }

    const title       = titleIdx  >= 0 ? cols[titleIdx]  : '';
    const description = descIdx   >= 0 ? cols[descIdx]   : '';
    if (title) items.push({ title, description });
  }
  return items;
}

// ── DOM builders ────────────────────────────────────────────

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
 * Render a full section
 * @param {{ key, sheetName, label, icon }} section
 * @param {Array} items
 * @param {number} sectionIndex
 * @returns {HTMLElement}
 */
function createSectionEl(section, items, sectionIndex) {
  const itemOffset = sectionIndex * 10;

  const sectionEl = document.createElement('section');
  sectionEl.className = 'munchie-section';
  sectionEl.setAttribute('aria-label', section.label);

  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <span class="section-icon" aria-hidden="true">${section.icon}</span>
    <h2 class="section-title">${section.label}</h2>
    <div class="section-line" aria-hidden="true"></div>
  `;

  const ul = document.createElement('ul');
  ul.className = 'item-list';
  items.forEach((itemData, idx) => {
    ul.appendChild(createItemEl(itemData, itemOffset + idx));
  });

  sectionEl.appendChild(header);
  sectionEl.appendChild(ul);
  return sectionEl;
}

/**
 * Show error state in the loading element
 * @param {string} message
 */
function showError(message) {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = `
      <span style="font-size:2rem">😕</span>
      <span style="color:#e8f0ef">${message}</span>
      <span style="font-size:0.8rem;color:#5a7a78">Asegurate de que la hoja de Google esté pública.</span>
    `;
  }
}

// ── Init ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  Promise.all(
    SECTIONS.map((section) =>
      fetch(sheetUrl(section.sheetName))
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status} for "${section.sheetName}"`);
          return res.text();
        })
        .then((csv) => ({ section, items: parseCSV(csv) }))
    )
  )
    .then((results) => {
      const loading = document.getElementById('loading');
      if (loading) loading.remove();

      const app = document.getElementById('app');
      results.forEach(({ section, items }, sectionIndex) => {
        if (items.length > 0) {
          const sorted = [...items].sort((a, b) => a.title.localeCompare(b.title));
          app.appendChild(createSectionEl(section, sorted, sectionIndex));
        }
      });
    })
    .catch((err) => {
      console.error('Munchie Matrix:', err);
      showError('No se pudo cargar la lista.');
    });
});
