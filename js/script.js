'use strict';

/* =========================================================
   Abdullah Property Center - site script
   - Safe rendering (no innerHTML, no inline handlers)
   - Numeric prices, formatted at display time
   - Contact form -> WhatsApp
   - Listings from Supabase (optional) or LOCAL_PROPERTIES
   ========================================================= */

/* ---------- Config ---------- */
const WHATSAPP_NUMBER = '923006027894';

// Optional: fill both to load listings from Supabase (see supabase-schema.sql).
// The anon key is designed to be public; Row Level Security protects the data.
const SUPABASE_URL = '';       // e.g. 'https://abcdxyz.supabase.co'
const SUPABASE_ANON_KEY = '';

const TYPES = ['house', 'plot', 'commercial', 'apartment'];
const PURPOSES = ['sale', 'rent'];
const SIZE_UNITS = { marla: 'Marla', kanal: 'Kanal', sqft: 'sq ft' };
const TYPE_ICONS = {
  house: 'fa-house',
  plot: 'fa-vector-square',
  commercial: 'fa-store',
  apartment: 'fa-building'
};

// Inline placeholder so a missing photo never shows a broken image.
// (If you add a CSP, allow `img-src 'self' data: https:`.)
const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">' +
  '<rect width="100%" height="100%" fill="#e5e7eb"/>' +
  '<text x="50%" y="50%" fill="#6b7280" font-family="sans-serif" font-size="32" text-anchor="middle">Photo coming soon</text>' +
  '</svg>'
);

/* ---------- Your real listings (used when Supabase is not configured) ----------
   Field names match the Supabase table, so you can migrate later without changes.
   price is a plain number in PKR (monthly rent when purpose is 'rent'),
   or null to show "Price on request".
   Use only properties the business actually holds, with your own photos. */
const LOCAL_PROPERTIES = [
  // DEMO LISTINGS - replace these with the business's real properties before launch.
  { id: 'DEMO-01', title: 'Demo 5 Marla Double Storey House', type: 'house', purpose: 'sale', area: 'Sargodha (Demo)', price: null, beds: 4, baths: 5, size_value: 5, size_unit: 'marla', image_url: 'assets/house-sale.svg' },
  { id: 'DEMO-02', title: 'Demo Residential Plot', type: 'plot', purpose: 'sale', area: 'Sargodha (Demo)', price: null, beds: null, baths: null, size_value: 5, size_unit: 'marla', image_url: 'assets/plot-sale.svg' },
  { id: 'DEMO-03', title: 'Demo Commercial Space', type: 'commercial', purpose: 'sale', area: 'Sargodha (Demo)', price: null, beds: null, baths: null, size_value: null, size_unit: null, image_url: 'assets/shop-sale.svg' },
  { id: 'DEMO-04', title: 'Demo Double Storey House', type: 'house', purpose: 'rent', area: 'Sargodha (Demo)', price: null, beds: 4, baths: 4, size_value: 6, size_unit: 'marla', image_url: 'assets/house-rent.svg' },
  { id: 'DEMO-05', title: 'Demo Family House', type: 'house', purpose: 'rent', area: 'Sargodha (Demo)', price: null, beds: 4, baths: 4, size_value: 4.5, size_unit: 'marla', image_url: 'assets/house-sale-2.svg' },
  { id: 'DEMO-06', title: 'Demo Apartment', type: 'apartment', purpose: 'rent', area: 'Sargodha (Demo)', price: null, beds: 2, baths: 3, size_value: null, size_unit: null, image_url: 'assets/apartment-sale.svg' }
];

/* ---------- Small helpers ---------- */
const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function icon(classes) {
  const i = el('i', classes);
  i.setAttribute('aria-hidden', 'true');
  return i;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function whatsappLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Only allow https images or same-origin (relative) paths.
function safeImageUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value.trim(), location.href);
    return url.protocol === 'https:' || url.origin === location.origin ? url.href : '';
  } catch {
    return '';
  }
}

/* ---------- Formatting ---------- */
function trimNumber(n) {
  return String(+n.toFixed(2));
}

function formatPrice(price, purpose) {
  if (price === null) return 'Price on request';
  let text;
  if (price >= 1e7) text = `${trimNumber(price / 1e7)} Crore`;
  else if (price >= 1e5) text = `${trimNumber(price / 1e5)} Lakh`;
  else text = price.toLocaleString('en-PK');
  return `PKR ${text}${purpose === 'rent' ? ' / Month' : ''}`;
}

function formatSize(value, unit) {
  if (!value || !unit) return '';
  return `${trimNumber(value)} ${SIZE_UNITS[unit]}`;
}

/* ---------- Data validation (treat all data as untrusted) ---------- */
function positiveNumberOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeProperty(row) {
  if (!row || typeof row !== 'object') return null;
  const hasPrice = row.price !== null && row.price !== undefined && row.price !== '';
  const price = hasPrice ? Number(row.price) : null;   // null = "Price on request"
  const type = TYPES.includes(row.type) ? row.type : null;
  const purpose = PURPOSES.includes(row.purpose) ? row.purpose : null;
  if (!row.title || !type || !purpose) return null;
  if (hasPrice && (!Number.isFinite(price) || price <= 0)) return null;

  return {
    id: String(row.id ?? '').slice(0, 60),
    title: String(row.title).slice(0, 120),
    type,
    purpose,
    area: String(row.area ?? '').slice(0, 120),
    price,
    beds: positiveNumberOrNull(row.beds),
    baths: positiveNumberOrNull(row.baths),
    size_value: positiveNumberOrNull(row.size_value),
    size_unit: Object.prototype.hasOwnProperty.call(SIZE_UNITS, row.size_unit) ? row.size_unit : null,
    image_url: safeImageUrl(row.image_url),
    featured: row.featured === true
  };
}

async function loadProperties() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const columns = 'id,title,type,purpose,area,price,beds,baths,size_value,size_unit,image_url,featured';
      const url = `${SUPABASE_URL}/rest/v1/properties?select=${columns}&is_published=eq.true&order=created_at.desc`;
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      return rows.map(normalizeProperty).filter(Boolean);
    } catch (err) {
      console.error('Could not load listings from Supabase:', err);
    }
  }
  return LOCAL_PROPERTIES.map(normalizeProperty).filter(Boolean);
}

/* ---------- Rendering (DOM APIs only: text is never parsed as HTML) ---------- */
function propertyCard(p) {
  const card = el('article', 'property-card');

  // Image + badges
  const imageWrap = el('div', 'property-image-wrap');
  const img = document.createElement('img');
  img.src = p.image_url || PLACEHOLDER_IMG;
  img.alt = p.title;
  img.loading = 'lazy';
  img.addEventListener('error', () => { img.src = PLACEHOLDER_IMG; }, { once: true });

  const badge = el('span', 'badge', p.purpose === 'rent' ? 'For Rent' : 'For Sale');
  const typeBadge = el('span', 'type-badge');
  typeBadge.append(icon(`fa-solid ${TYPE_ICONS[p.type]}`), ` ${capitalize(p.type)}`);
  imageWrap.append(img, badge, typeBadge);

  // Body
  const body = el('div', 'property-body');
  body.append(el('div', 'property-price', formatPrice(p.price, p.purpose)));
  body.append(el('h3', null, p.title));

  if (p.area) {
    const area = el('p', 'property-area');
    area.append(icon('fa-solid fa-location-dot'), ` ${p.area}`);
    body.append(area);
  }

  const meta = el('div', 'property-meta');
  const size = formatSize(p.size_value, p.size_unit);
  if (size) meta.append(el('span', null, size));
  if (p.beds) meta.append(el('span', null, `${p.beds} ${p.beds === 1 ? 'Bed' : 'Beds'}`));
  if (p.baths) meta.append(el('span', null, `${p.baths} ${p.baths === 1 ? 'Bath' : 'Baths'}`));
  if (meta.childNodes.length) body.append(meta);

  const actions = el('div', 'property-actions');
  const wa = el('a', 'btn btn-dark btn-small');
  const ref = p.id ? ` [Ref: ${p.id}]` : '';
  wa.href = whatsappLink(`Assalam o Alaikum, I am interested in: ${p.title}${p.area ? ` (${p.area})` : ''}${ref}`);
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.append(icon('fa-brands fa-whatsapp'), ' Ask on WhatsApp');
  actions.append(wa);
  body.append(actions);

  card.append(imageWrap, body);
  return card;
}

function renderProperties(list, target, emptyMessage) {
  if (!target) return;
  if (!list.length) {
    target.replaceChildren(el('div', 'empty-state', emptyMessage));
    return;
  }
  target.replaceChildren(...list.map(propertyCard));
}

/* ---------- Filters ---------- */
let allProperties = [];

function applyFilters() {
  const purpose = $('filterPurpose')?.value || '';
  const type = $('filterType')?.value || '';
  const area = ($('filterArea')?.value || '').trim().toLowerCase();

  const list = allProperties.filter((p) =>
    (!purpose || p.purpose === purpose) &&
    (!type || p.type === type) &&
    (!area || `${p.area} ${p.title}`.toLowerCase().includes(area))
  );

  const emptyMessage = allProperties.length
    ? 'No matching properties found. Contact us and we can check other options.'
    : 'Our current listings are being updated. Please contact us on WhatsApp for available options.';

  renderProperties(list, $('propertyGrid'), emptyMessage);

  const count = $('propertyCount');
  if (count) count.textContent = `Showing ${list.length} ${list.length === 1 ? 'property' : 'properties'}`;
}

function loadUrlFilters() {
  const q = new URLSearchParams(location.search);
  const purpose = q.get('purpose');
  const type = q.get('type');
  if ($('filterPurpose')) $('filterPurpose').value = PURPOSES.includes(purpose) ? purpose : '';
  if ($('filterType')) $('filterType').value = TYPES.includes(type) ? type : '';
  if ($('filterArea')) $('filterArea').value = (q.get('area') || '').slice(0, 60);
}

/* ---------- Home search -> properties page ---------- */
function setupHomeSearch() {
  $('homeSearch')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const q = new URLSearchParams();
    const purpose = f.get('purpose');
    const type = f.get('type');
    const area = String(f.get('area') || '').trim().slice(0, 60);
    if (PURPOSES.includes(purpose)) q.set('purpose', purpose);
    if (TYPES.includes(type)) q.set('type', type);
    if (area) q.set('area', area);
    location.href = 'properties.html' + (q.toString() ? `?${q}` : '');
  });
}

/* ---------- Contact form -> WhatsApp ---------- */
function setupContactForm() {
  const form = $('contactForm');
  if (!form) return;
  const phoneInput = form.elements.phone;
  phoneInput?.addEventListener('input', () => phoneInput.setCustomValidity(''));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const name = String(f.get('name') || '').trim().slice(0, 80);
    const phone = String(f.get('phone') || '').trim().slice(0, 20);
    const interest = String(f.get('interest') || '').trim().slice(0, 60);
    const message = String(f.get('message') || '').trim().slice(0, 800);

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13) {
      phoneInput.setCustomValidity('Please enter a valid phone number.');
      phoneInput.reportValidity();
      return;
    }
    if (!name || !message) return;

    const text =
      `Assalam o Alaikum, I am ${name} (${phone}).\n` +
      `Interested in: ${interest}\n\n${message}`;
    window.open(whatsappLink(text), '_blank', 'noopener');
  });
}

/* ---------- Menu, year, reveal ---------- */
function setupChrome() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  toggle?.addEventListener('click', () => {
    const open = nav?.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(Boolean(open)));
  });

  const year = $('year');
  if (year) year.textContent = new Date().getFullYear();

  document.querySelectorAll('[data-reveal]').forEach((node) =>
    requestAnimationFrame(() => node.classList.add('visible'))
  );
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  // Wire up everything that doesn't need data first.
  setupChrome();
  setupHomeSearch();
  setupContactForm();
  ['filterPurpose', 'filterType', 'filterArea'].forEach((id) =>
    $(id)?.addEventListener('input', applyFilters)
  );
  $('clearFilters')?.addEventListener('click', () => {
    ['filterPurpose', 'filterType', 'filterArea'].forEach((id) => { if ($(id)) $(id).value = ''; });
    history.replaceState({}, '', location.pathname);
    applyFilters();
  });

  // Then load listings if this page shows any.
  const grid = $('propertyGrid');
  const featured = $('featuredProperties');
  if (!grid && !featured) return;

  allProperties = await loadProperties();

  if (grid) {
    loadUrlFilters();
    applyFilters();
  }
  if (featured) {
    const picks = allProperties.filter((p) => p.featured);
    renderProperties(
      (picks.length ? picks : allProperties).slice(0, 6),
      featured,
      'Our current listings are being updated. Please contact us on WhatsApp for available options.'
    );
  }
});
