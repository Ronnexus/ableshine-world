// Netlify build step: copies the site into dist/ and, from data/site.json,
// (1) pre-renders the chapter cards so search engines and no-JavaScript visitors see the events,
// (2) adds schema.org Event data so Google can list the events,
// (3) makes the link-preview image and URLs absolute so Facebook/WhatsApp previews work.
// data/site.json stays the single source of truth; nothing in the repo is rewritten.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const SITE = (process.env.URL || 'https://ableshine-world.netlify.app').replace(/\/$/, '');

const site = JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8'));
const cfg = site.config || {};
const org = cfg.orgName || 'AbleShine';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = p => (!p ? '' : /^https?:\/\//i.test(p) ? p : SITE + '/' + String(p).replace(/^\.?\//, ''));
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const pad = n => String(n).padStart(2, '0');

// Same ordering rules as index.html: dated chapters by date, then undated by name.
const pub = (site.events || []).filter(e => e.published !== false && e.name);
const chapters = pub.filter(e => isDate(e.date)).sort((a, b) => a.date.localeCompare(b.date))
  .concat(pub.filter(e => !isDate(e.date)).sort((a, b) => a.name.localeCompare(b.name)))
  .map((e, i) => ({ ...e, num: pad(i + 1) }));

function longDate(d) {
  if (!isDate(d)) return 'Date to be confirmed';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function melbOffset(d) {
  try {
    const name = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', timeZoneName: 'longOffset' })
      .formatToParts(new Date(d + 'T02:00:00Z')).find(p => p.type === 'timeZoneName').value; // e.g. GMT+11:00
    const m = name.match(/([+-]\d{2}:\d{2})/);
    return m ? m[1] : '+10:00';
  } catch { return '+10:00'; }
}
function timeRange(t) {
  const m = String(t || '').match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*[–—-]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!m) return null;
  const hh = (h, mi, ap) => { let x = Number(h) % 12; if (ap.toLowerCase() === 'pm') x += 12; return pad(x) + ':' + (mi || '00'); };
  return [hh(m[1], m[2], m[3]), hh(m[4], m[5], m[6])];
}

// 1. static cards (JavaScript replaces these with the interactive ones on load)
const cards = chapters.map(c => `<article class="card panel"><span class="cbody"><strong>Chapter ${esc(c.num)}: ${esc(c.name)}</strong><span>${esc(longDate(c.date))}${c.time ? ', ' + esc(c.time) : ''}</span><span>${esc(c.venue || 'Venue to be confirmed')}</span></span></article>`).join('\n');

// 2. schema.org Event data (only chapters with a confirmed date and venue)
const ld = chapters.filter(c => isDate(c.date) && c.venue).map(c => {
  const off = melbOffset(c.date), tr = timeRange(c.time);
  const ev = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: `${org} Chapter ${c.num}: ${c.name}`,
    startDate: tr ? `${c.date}T${tr[0]}:00${off}` : c.date,
    eventStatus: c.previousDate ? 'https://schema.org/EventRescheduled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: c.venue,
      address: { '@type': 'PostalAddress', ...(c.address ? { streetAddress: c.address } : {}), addressLocality: c.name, addressRegion: 'VIC', addressCountry: 'AU' }
    },
    description: (c.easyRead || []).join(' ') || cfg.tagline || 'Free, all-abilities community day.',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'AUD', availability: 'https://schema.org/InStock', url: `${SITE}/#ch-${c.id}` },
    organizer: { '@type': 'Organization', name: org, url: cfg.website ? (/^https?:/i.test(cfg.website) ? cfg.website : 'https://' + cfg.website) : SITE },
    url: `${SITE}/#ch-${c.id}`
  };
  if (tr) ev.endDate = `${c.date}T${tr[1]}:00${off}`;
  if (c.posterId) ev.image = [abs(c.posterId)];
  return ev;
});
const jsonld = ld.map(e => `<script type="application/ld+json">${JSON.stringify(e).replace(/</g, '\\u003c')}</script>`).join('\n');

// 3. absolute preview image + canonical URL
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const need = (marker) => { if (!html.includes(marker)) throw new Error('Missing marker in index.html: ' + marker); };
need('<!--SEO-CARDS-->'); need('<!--SEO-JSONLD-->');
const logo = abs(cfg.logoId || 'media/logo.png');
html = html
  .replace('<!--SEO-CARDS-->', cards)
  .replace('<!--SEO-JSONLD-->', [
    `<link rel="canonical" href="${SITE}/">`,
    `<meta property="og:url" content="${SITE}/">`,
    '<meta property="og:type" content="website">',
    '<meta name="twitter:card" content="summary">',
    jsonld
  ].join('\n'))
  .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${logo}">`);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'index.html'), html);
for (const dir of ['data', 'media']) fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
console.log(`Built dist/ for ${SITE}: ${chapters.length} chapters, ${ld.length} with search event data.`);
