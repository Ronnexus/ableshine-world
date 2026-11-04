// Netlify build step. Copies the site into dist/ and generates, from data/site.json:
//  - the home page (index.html) with an SEO title/description, absolute share previews,
//    Organization + WebSite + Event structured data and pre-rendered chapter cards
//  - a real, crawlable page per chapter at /chapters/<id>/ (tickets, details, Easy Read,
//    access, poster, photos, Facebook/Instagram links, Event + Breadcrumb data)
//  - an events index at /chapters/, sitemap.xml and robots.txt
// data/site.json stays the single source of truth; nothing in the repo is rewritten.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const SITE = (process.env.URL || 'https://ableshine.com.au').replace(/\/$/, '');

const site = JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8'));
const cfg = site.config || {};
const org = cfg.orgName || 'AbleShine';

// ---------- helpers ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const isDate = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
const rootPath = p => (!p ? '' : /^https?:\/\//i.test(p) ? p : '/' + String(p).replace(/^\.?\//, ''));
const abs = p => (!p ? '' : /^https?:\/\//i.test(p) ? p : SITE + rootPath(p));
const safeUrl = u => {
  u = String(u || '').trim(); if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; }
};
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
const melbToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const buildDate = melbToday;

function longDate(d) {
  if (!isDate(d)) return 'Date to be confirmed';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
function shortDate(d) {
  if (!isDate(d)) return 'Date TBC';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function melbOffset(d) {
  try {
    const name = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', timeZoneName: 'longOffset' })
      .formatToParts(new Date(d + 'T02:00:00Z')).find(p => p.type === 'timeZoneName').value;
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

// ---------- chapters (same rules as index.html) ----------
const COLORS = ['purple', 'pink', 'teal', 'amber'];
const HEX = { purple: '#4B1F9E', pink: '#D3166F', teal: '#0B7DB3', amber: '#FFC72C', lilac: '#EFE6FF' };
const STATUS = { wrapped: 'Snapshots ready', live: 'Happening today', next: 'Up next', upcoming: 'Coming up', soon: 'Date TBC' };
const pub = (site.events || []).filter(e => e.published !== false && e.name);
let nextGiven = false;
const chapters = pub.filter(e => isDate(e.date)).sort((a, b) => a.date.localeCompare(b.date))
  .concat(pub.filter(e => !isDate(e.date)).sort((a, b) => a.name.localeCompare(b.name)))
  .map((e, i) => {
    let status;
    if (!isDate(e.date)) status = 'soon';
    else if (e.date < melbToday) status = 'wrapped';
    else if (e.date === melbToday) { status = 'live'; nextGiven = true; }
    else if (!nextGiven) { status = 'next'; nextGiven = true; }
    else status = 'upcoming';
    const color = COLORS.includes(e.color) ? e.color : (status === 'soon' ? 'lilac' : COLORS[i % 4]);
    return {
      ...e, num: pad(i + 1), status, color,
      page: `/chapters/${e.id}/`,
      tickets: status !== 'wrapped' ? safeUrl(e.ticketUrl) : '',
      snaps: (site.snapshots || []).filter(s => s.eventId === e.id).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
    };
  });

const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const sameSite = u => host(u) === host(SITE);
const socials = [['Facebook', safeUrl(cfg.facebook)], ['Instagram', safeUrl(cfg.instagram)]].filter(s => s[1]);
const website = safeUrl(cfg.website);
const homeTitle = cfg.seoTitle || `${org} | Free all-abilities community events in Melbourne`;
const homeDesc = clip(cfg.seoDescription || `${cfg.about || 'Free, all-abilities community days across Melbourne.'} Explore every ${org} event in a 3D world: dates, venues, what's on, access and photos.`, 158);

function chapterDesc(c) {
  const bits = [`${c.name}: a free, all-abilities community day`];
  if (isDate(c.date)) bits.push(`on ${longDate(c.date)}`);
  if (c.venue) bits.push(`at ${c.venue}`);
  let s = bits.join(' ') + '.';
  const lu = (c.lineup || []).filter(Boolean).slice(0, 3);
  if (lu.length) s += ` ${lu.join(', ')} and more.`;
  s += ' Support workers free.';
  return clip(s, 158);
}
function eventLd(c) {
  if (!isDate(c.date) || !c.venue) return null;
  const off = melbOffset(c.date), tr = timeRange(c.time);
  const ev = {
    '@context': 'https://schema.org', '@type': 'Event',
    name: `${org} Chapter ${c.num}: ${c.name}`,
    startDate: tr ? `${c.date}T${tr[0]}:00${off}` : c.date,
    eventStatus: c.previousDate ? 'https://schema.org/EventRescheduled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: c.venue, address: { '@type': 'PostalAddress', ...(c.address ? { streetAddress: c.address } : {}), addressLocality: c.name, addressRegion: 'VIC', addressCountry: 'AU' } },
    description: chapterDesc(c),
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'AUD', availability: 'https://schema.org/InStock', url: c.tickets || SITE + c.page, ...(isDate(c.date) ? { validThrough: c.date } : {}) },
    organizer: { '@type': 'Organization', name: org, url: website || SITE + '/' },
    url: SITE + c.page
  };
  if (tr) ev.endDate = `${c.date}T${tr[1]}:00${off}`;
  if (c.posterId) ev.image = [abs(c.posterId)];
  return ev;
}
const orgLd = {
  '@context': 'https://schema.org', '@type': 'Organization', name: org, url: SITE + '/',
  logo: abs(cfg.logoId || 'media/logo.png'),
  ...(cfg.phone ? { telephone: cfg.phone } : {}), ...(cfg.email ? { email: cfg.email } : {}),
  ...(socials.length || (website && !sameSite(website)) ? { sameAs: [...socials.map(s => s[1]), ...(website && !sameSite(website) ? [website] : [])] } : {})
};

// ---------- shared page chrome for the static pages ----------
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@500;700;800;900&display=swap">';
const CSS = `<style>
:root{--ink:#22114A;--purple:#4B1F9E;--pink:#D3166F;--blue:#0B7DB3;--yellow:#FFC72C;--cream:#FFFBF2;--lilac:#EFE6FF;--muted:#4D3F70;color-scheme:light}
*{box-sizing:border-box}html,body{margin:0}img{max-width:100%;height:auto}
body{font-family:Nunito,'Segoe UI',system-ui,sans-serif;font-size:17px;line-height:1.55;color:var(--ink);background:var(--cream);background-image:radial-gradient(rgba(75,31,158,.1) 1.4px,transparent 1.6px);background-size:14px 14px}
a{color:var(--purple);font-weight:700}a:focus-visible,.btn:focus-visible{outline:4px solid var(--yellow);outline-offset:3px}
.wrap{max-width:1040px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.top{background:#fff;border-bottom:3px solid var(--ink)}.top .wrap{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding-block:10px}
.top img{height:48px;width:auto;display:block}.top nav{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 1.1em;border-radius:999px;border:3px solid var(--ink);background:#fff;color:var(--ink);font-weight:900;text-decoration:none;box-shadow:3px 3px 0 var(--ink);white-space:nowrap}
.btn.pink{background:var(--pink);color:#fff}.btn.yellow{background:var(--yellow);color:var(--ink)}.btn.purple{background:var(--purple);color:#fff}
.hero{border-bottom:3px solid var(--ink);color:#fff;background-image:radial-gradient(rgba(255,255,255,.2) 1.5px,transparent 1.8px);background-size:12px 12px}
.hero .wrap{padding-block:28px 32px;display:flex;flex-direction:column;gap:12px;align-items:flex-start}
.c-purple{background-color:var(--purple)}.c-pink{background-color:var(--pink)}.c-teal{background-color:var(--blue)}.c-amber{background-color:var(--yellow);color:var(--ink)}.c-lilac{background-color:var(--lilac);color:var(--ink)}
.brush{display:inline-block;font-family:'Lilita One',Nunito,sans-serif;background:var(--yellow);color:var(--ink);padding:.15em .9em .2em;font-size:1.3rem;clip-path:polygon(2% 10%,12% 0,30% 7%,52% 0,74% 8%,92% 0,100% 14%,97% 50%,100% 88%,86% 100%,64% 92%,40% 100%,18% 93%,0 100%,3% 55%)}
.c-amber .brush{background:var(--purple);color:#fff}
h1,h2{font-family:'Lilita One',Nunito,sans-serif;font-weight:400;line-height:1.02;margin:0;text-wrap:balance}
.hero h1{font-size:clamp(2.6rem,7vw,4.4rem);color:#fff;text-shadow:3px 3px 0 var(--ink),-2px -2px 0 var(--ink),2px -2px 0 var(--ink),-2px 2px 0 var(--ink)}
.c-amber h1,.c-lilac h1{color:#fff}
.hero p{margin:0;font-size:1.2rem;font-weight:800}
.chip{display:inline-block;border:2px solid var(--ink);border-radius:999px;padding:.1em .7em;font-weight:800;font-size:.85rem;background:#fff;color:var(--ink)}
.acts{display:flex;flex-wrap:wrap;gap:10px}
main.wrap{padding-block:28px 48px;display:grid;gap:22px}
.card{background:#fff;border:3px solid var(--ink);border-radius:18px;box-shadow:5px 5px 0 var(--ink);padding:20px}
.card h2{font-size:1.7rem;margin-bottom:10px;color:var(--purple)}
dl{margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px 20px}
dt{font-size:.75rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}dd{margin:2px 0 0;font-weight:800}
.easy{font-size:1.15rem;line-height:1.7;margin:0;padding-left:1.3em}
.chips{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px}.chips li{border:2px solid var(--ink);border-radius:999px;padding:.25em .9em;font-weight:800;background:var(--cream)}
.change{background:#fff;color:var(--ink);border:3px solid var(--ink);border-radius:12px;padding:10px 14px;font-weight:700}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px;align-items:start}
.poster img{border:3px solid var(--ink);border-radius:14px;display:block}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}.grid figure{margin:0}.grid img{aspect-ratio:1/1;object-fit:cover;border:3px solid var(--ink);border-radius:12px;display:block;width:100%}
.grid figcaption{font-size:.9rem;font-weight:700;margin-top:4px}
.list{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.ev{display:flex;flex-wrap:wrap;align-items:center;gap:12px;background:#fff;border:3px solid var(--ink);border-radius:16px;padding:14px;box-shadow:4px 4px 0 var(--ink)}
.ev .n{flex:none;width:52px;height:52px;border-radius:12px;border:2px solid var(--ink);display:grid;place-items:center;font-weight:900;font-size:1.1rem}
.ev .t{flex:1;min-width:200px}.ev .t a{font-family:'Lilita One',Nunito,sans-serif;font-weight:400;font-size:1.5rem;text-decoration:none;color:var(--ink)}
.ev .t span{display:block;color:var(--muted);font-weight:700}
.note{color:var(--muted);font-size:.95rem}
footer{background:var(--ink);color:#fff}footer .wrap{padding-block:26px;display:flex;flex-wrap:wrap;gap:16px 28px;justify-content:space-between}footer a{color:var(--yellow)}
footer strong{font-family:'Lilita One',Nunito,sans-serif;font-weight:400;font-size:1.5rem;color:var(--yellow);display:block}
.skiplink{position:absolute;left:-9999px;top:8px;z-index:9}.skiplink:focus{left:16px}
.crumbs{font-size:.9rem;padding-block:10px 0}.crumbs a{font-weight:700}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>`;

function head({ title, desc, url, image, extra = '' }) {
  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:site_name" content="${esc(org)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${esc(image)}">
<meta property="og:locale" content="en_AU">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/media/logo.png">
${FONTS}
${CSS}
${extra}
</head>
<body>`;
}
function topbar() {
  return `<header class="top"><div class="wrap">
<a href="/" aria-label="${esc(org)} home"><img src="${esc(rootPath(cfg.logoId || 'media/logo.png'))}" alt="${esc(org)}" width="110" height="58"></a>
<nav aria-label="Main">
<a class="btn" href="/chapters/">All events</a>
<a class="btn" href="/partners/">Partners</a>
<a class="btn purple" href="/">Explore the 3D world</a>
<a class="btn pink" href="/tickets/">Get tickets</a>
</nav></div></header>`;
}
function footer() {
  const bits = [];
  if (cfg.phone) bits.push(`Phone: <a href="tel:${esc(cfg.phone.replace(/\s+/g, ''))}">${esc(cfg.phone)}</a>`);
  if (cfg.email) bits.push(`Email: <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a>`);
  if (website && !sameSite(website)) bits.push(`<a href="${esc(website)}">${esc(website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>`);
  const soc = socials.map(s => `<a href="${esc(s[1])}" target="_blank" rel="noopener">${s[0]}</a>`).join(' · ');
  return `<footer><div class="wrap">
<div><strong>${esc(org)}</strong>${esc(cfg.about || 'Free, all-abilities community days across Melbourne.')}</div>
<div>${bits.join('<br>')}${soc ? `<br>Follow us: ${soc}` : ''}</div>
</div></footer>
</body>
</html>`;
}
const nextCh = chapters.find(c => c.status === 'live' || c.status === 'next');
const imgFor = c => abs(c.posterId || cfg.logoId || 'media/logo.png');

// ---------- chapter pages ----------
function chapterPage(c, i) {
  const prev = chapters[i - 1], next = chapters[i + 1];
  const url = SITE + c.page;
  const title = clip(`${org} ${c.name} | ${shortDate(c.date)} | Free all-abilities community day`, 70);
  const desc = chapterDesc(c);
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: org, item: SITE + '/' },
    { '@type': 'ListItem', position: 2, name: 'Events', item: SITE + '/chapters/' },
    { '@type': 'ListItem', position: 3, name: `Chapter ${c.num}: ${c.name}`, item: url }] };
  const ev = eventLd(c);
  const access = (c.access || []).filter(Boolean), lineup = (c.lineup || []).filter(Boolean), easy = (c.easyRead || []).filter(Boolean);
  const fb = safeUrl(c.facebookUrl), ig = safeUrl(c.instagramUrl);
  const tixBtn = c.tickets ? `<a class="btn yellow" href="${esc(c.tickets)}" target="_blank" rel="noopener">Get tickets on Eventbrite</a>` : '';
  const html = head({ title, desc, url, image: imgFor(c), extra: [ld(crumbs), ev ? ld(ev) : ''].join('\n') }) + `
<a class="btn skiplink" href="#main">Skip to the event details</a>
${topbar()}
<section class="hero c-${c.color}"><div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/" style="color:inherit">Home</a> › <a href="/chapters/" style="color:inherit">Events</a> › Chapter ${esc(c.num)}</nav>
<span class="brush">Chapter ${esc(c.num)}</span>
<h1>${esc(c.name)}</h1>
<p>${esc(longDate(c.date))}${c.time ? ' · ' + esc(c.time) : ''}${c.venue ? ' · ' + esc(c.venue) : ''}</p>
<span class="chip">${esc(STATUS[c.status])}</span>
${c.previousDate ? `<div class="change" role="status"><strong>Date changed.</strong> Was ${esc(c.previousDate)}, now ${esc(longDate(c.date))}. Same venue, please update your calendar.</div>` : ''}
<div class="acts">${tixBtn}<a class="btn" href="/#ch-${esc(c.id)}">Walk there in the 3D world</a></div>
</div></section>
<main id="main" class="wrap">
<div class="two">
<section class="card" aria-labelledby="h-ess"><h2 id="h-ess">The essentials</h2>
<dl>
<div><dt>When</dt><dd>${esc(longDate(c.date))}</dd></div>
<div><dt>Time</dt><dd>${esc(c.time || 'To be confirmed')}</dd></div>
<div><dt>Where</dt><dd>${esc(c.venue || 'To be confirmed')}${c.address ? `<br><span style="font-weight:600">${esc(c.address)}</span>` : ''}</dd></div>
<div><dt>Cost</dt><dd>Free. Support workers free.</dd></div>
</dl>
<div class="acts" style="margin-top:16px">${tixBtn}${c.venue ? `<a class="btn" href="https://www.google.com/maps/search/?api=1&amp;query=${esc(encodeURIComponent([c.venue, c.address].filter(Boolean).join(', ')))}" target="_blank" rel="noopener">Directions</a>` : ''}${fb ? `<a class="btn" href="${esc(fb)}" target="_blank" rel="noopener">Facebook event</a>` : ''}${ig ? `<a class="btn" href="${esc(ig)}" target="_blank" rel="noopener">See it on Instagram</a>` : ''}</div>
</section>
${c.posterId ? `<figure class="card poster" style="margin:0"><img src="${esc(rootPath(c.posterId))}" alt="${esc(c.posterAlt || `Poster for ${org} Chapter ${c.num}, ${c.name}`)}" loading="lazy"></figure>` : ''}
</div>
${easy.length ? `<section class="card" aria-labelledby="h-easy"><h2 id="h-easy">Easy Read</h2><ul class="easy">${easy.map(t => `<li>${esc(t)}</li>`).join('')}</ul></section>` : ''}
<section class="card" aria-labelledby="h-on"><h2 id="h-on">What's on</h2>
${lineup.length ? `<ul class="chips">${lineup.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p class="note" style="margin:0">The program lands once the day is locked in.</p>'}
<p style="margin:14px 0 0">Every activity has three ways to join in: <strong>Passive</strong> (sit back and soak it up), <strong>Light</strong> (join in as much as feels good) or <strong>Full</strong> (dive in and help run the fun).</p>
</section>
<section class="card" aria-labelledby="h-acc"><h2 id="h-acc">Access on the day</h2>
${access.length ? `<ul class="chips">${access.map(t => `<li>${esc(t)}</li>`).join('')}</ul><p class="note" style="margin:10px 0 0">Need something else? Tell us when you book.</p>` : '<p style="margin:0">Access details for this venue are being confirmed. Tell us what you need when you book and we will let you know.</p>'}
</section>
${c.snaps.length ? `<section class="card" aria-labelledby="h-ph"><h2 id="h-ph">Snapshots from the day</h2><div class="grid">${c.snaps.map(s => `<figure><img src="${esc(rootPath(s.assetId))}" alt="${esc(s.alt || s.caption || '')}" loading="lazy">${s.caption ? `<figcaption>${esc(s.caption)}</figcaption>` : ''}</figure>`).join('')}</div><p class="note">Spotted yourself and want a photo taken down? Contact us and we will remove it.</p></section>` : ''}
<nav class="acts" aria-label="Other chapters">${prev ? `<a class="btn" href="${prev.page}">◀ Chapter ${prev.num}: ${esc(prev.name)}</a>` : ''}<a class="btn" href="/chapters/">All events</a>${next ? `<a class="btn yellow" href="${next.page}">Chapter ${next.num}: ${esc(next.name)} ▶</a>` : ''}</nav>
</main>
${footer()}`;
  const dir = path.join(out, 'chapters', c.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

// ---------- events index ----------
function eventsIndex() {
  const url = SITE + '/chapters/';
  const title = `All ${org} events in Melbourne | Free all-abilities community days`;
  const desc = clip(`Every ${org} chapter in one place: dates, venues, tickets and photos from free, all-abilities community days across Melbourne. Support workers free.`, 158);
  const list = { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: chapters.map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + c.page, name: `Chapter ${c.num}: ${c.name}` })) };
  const items = chapters.map(c => `<li class="ev"><span class="n c-${c.color}" style="color:${c.color === 'amber' || c.color === 'lilac' ? 'var(--ink)' : '#fff'}">${esc(c.num)}</span>
<span class="t"><a href="${c.page}">${esc(c.name)}</a><span>${esc(longDate(c.date))}${c.time ? ' · ' + esc(c.time) : ''} · ${esc(c.venue || 'Venue to be confirmed')}</span></span>
<span class="chip">${esc(STATUS[c.status])}</span>
${c.tickets ? `<a class="btn pink" href="${esc(c.tickets)}" target="_blank" rel="noopener" aria-label="Get tickets for ${esc(c.name)} (opens Eventbrite)">Get tickets</a>` : ''}</li>`).join('\n');
  const html = head({ title, desc, url, image: abs(cfg.logoId || 'media/logo.png'), extra: ld(list) }) + `
${topbar()}
<section class="hero c-purple"><div class="wrap">
<span class="brush">${chapters.length} ${chapters.length === 1 ? 'chapter' : 'chapters'} and counting</span>
<h1>All ${esc(org)} events</h1>
<p>${esc(cfg.tagline || 'Free, all-abilities community days across Melbourne.')}</p>
</div></section>
<main class="wrap"><ol class="list">${items || '<li class="card">The first chapter is coming soon.</li>'}</ol></main>
${footer()}`;
  fs.mkdirSync(path.join(out, 'chapters'), { recursive: true });
  fs.writeFileSync(path.join(out, 'chapters', 'index.html'), html);
}

// ---------- tickets page: every upcoming event, straight to booking ----------
function ticketsPage() {
  const url = SITE + '/tickets/';
  const up = chapters.filter(c => c.status !== 'wrapped');
  const phone = cfg.rsvp || cfg.phone || '';
  const title = `Get tickets | ${org} free all-abilities community days in Melbourne`;
  const desc = clip(`Book free tickets for upcoming ${org} days${up.length ? ': ' + up.map(c => `${c.name} ${shortDate(c.date)}`).join(', ') : ''}. Support workers free.`, 158);
  const items = up.map(c => `<li class="ev"><span class="n c-${c.color}" style="color:${c.color === 'amber' || c.color === 'lilac' ? 'var(--ink)' : '#fff'}">${esc(c.num)}</span>
<span class="t"><a href="${c.page}">${esc(c.name)}</a><span>${esc(longDate(c.date))}${c.time ? ' · ' + esc(c.time) : ''}</span><span>${esc(c.venue || 'Venue to be confirmed')}</span></span>
<span class="acts">${c.tickets ? `<a class="btn pink" href="${esc(c.tickets)}" target="_blank" rel="noopener" aria-label="Get tickets for ${esc(c.name)}, ${esc(shortDate(c.date))} (opens Eventbrite)">Get tickets</a>` : '<span class="chip">Tickets coming soon</span>'}<a class="btn" href="${c.page}">Details</a></span></li>`).join('\n');
  const html = head({ title, desc, url, image: abs(cfg.logoId || 'media/logo.png') }) + `
${topbar()}
<section class="hero c-pink"><div class="wrap">
<span class="brush">No tour needed</span>
<h1>Get tickets</h1>
<p>Every ${esc(org)} day is free. Pick your event and book in a few taps. Support workers come free too.</p>
</div></section>
<main class="wrap">
${up.length ? `<ol class="list">${items}</ol>` : '<section class="card"><h2>No upcoming events yet</h2><p style="margin:0">New dates are on the way. Check back soon.</p></section>'}
${up.some(c => !c.tickets) && phone ? `<p class="card" style="margin:0">No ticket link yet? Message us on WhatsApp: <strong>${esc(phone)}</strong></p>` : ''}
<p class="note">Want to look around first? <a href="/">Explore the AbleShine 3D world</a> or see <a href="/chapters/">all events</a>.</p>
</main>
${footer()}`;
  fs.mkdirSync(path.join(out, 'tickets'), { recursive: true });
  fs.writeFileSync(path.join(out, 'tickets', 'index.html'), html);
}

// ---------- partners page ----------
function partnersPage() {
  const url = SITE + '/partners/';
  const list = (site.partners || []).filter(p => p && p.name);
  const title = `${org} partners and sponsors | Free all-abilities community days in Melbourne`;
  const desc = clip(list.length ? `${org} days are free thanks to our partners and sponsors: ${list.map(p => p.name).join(', ')}.` : `${org} days are free thanks to local partners and sponsors. Find out how your organisation can partner with ${org}.`, 158);
  const cards = list.map(p => { const u = safeUrl(p.url);
    return `<li class="card" style="display:flex;flex-direction:column;gap:8px">${p.logo ? `<img src="${esc(rootPath(p.logo))}" alt="${esc(p.name)} logo" loading="lazy" style="max-height:80px;width:auto;object-fit:contain;align-self:flex-start">` : ''}<strong style="font-size:1.2rem">${esc(p.name)}</strong>${p.type ? `<span class="chip" style="align-self:flex-start">${esc(p.type)}</span>` : ''}${p.blurb ? `<span>${esc(p.blurb)}</span>` : ''}${u ? `<a class="btn" style="align-self:flex-start" href="${esc(u)}" target="_blank" rel="noopener">Visit ${esc(p.name)}</a>` : ''}</li>`; }).join('\n');
  const html = head({ title, desc, url, image: abs(cfg.logoId || 'media/logo.png') }) + `
${topbar()}
<section class="hero c-amber"><div class="wrap">
<span class="brush">Thank you</span>
<h1>Our partners</h1>
<p>${esc(org)} days are free because local organisations back them.</p>
</div></section>
<main class="wrap">
${list.length ? `<ul class="list" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${cards}</ul>` : '<section class="card"><h2>Partner spots are open</h2><p style="margin:0">Our first partners and sponsors will appear here soon.</p></section>'}
<section class="card"><h2>Partner with ${esc(org)}</h2>
<p>Want your organisation in our Partners tent and on our event days? We would love to hear from you.</p>
<div class="acts">${cfg.email ? `<a class="btn pink" href="mailto:${esc(cfg.email)}?subject=${encodeURIComponent('Partnering with ' + org)}">Email ${esc(cfg.email)}</a>` : ''}${cfg.phone ? `<a class="btn" href="tel:${esc(cfg.phone.replace(/\s+/g, ''))}">Call ${esc(cfg.phone)}</a>` : ''}<a class="btn purple" href="/#partners">Visit the Partners tent in 3D</a></div>
</section>
</main>
${footer()}`;
  fs.mkdirSync(path.join(out, 'partners'), { recursive: true });
  fs.writeFileSync(path.join(out, 'partners', 'index.html'), html);
}

// ---------- home page (the 3D world) ----------
function home() {
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const m of ['<!--SEO-CARDS-->', '<!--SEO-JSONLD-->']) if (!html.includes(m)) throw new Error('Missing marker in index.html: ' + m);
  const cards = chapters.map(c => `<a class="card panel" href="${c.page}" style="text-decoration:none;color:inherit"><span class="cbody"><strong>Chapter ${esc(c.num)}: ${esc(c.name)}</strong><span>${esc(longDate(c.date))}${c.time ? ', ' + esc(c.time) : ''}</span><span>${esc(c.venue || 'Venue to be confirmed')}</span></span></a>`).join('\n');
  const websiteLd = { '@context': 'https://schema.org', '@type': 'WebSite', name: cfg.title || `${org} World`, url: SITE + '/' };
  const events = chapters.map(eventLd).filter(Boolean);
  html = html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(homeTitle)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(homeDesc)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(homeTitle)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(homeDesc)}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${esc(abs(cfg.logoId || 'media/logo.png'))}">`)
    .replace('<!--SEO-CARDS-->', cards)
    .replace('<!--SEO-JSONLD-->', [
      `<link rel="canonical" href="${SITE}/">`,
      `<meta property="og:url" content="${SITE}/">`,
      '<meta property="og:type" content="website">',
      '<meta property="og:locale" content="en_AU">',
      `<meta property="og:site_name" content="${esc(org)}">`,
      '<meta name="twitter:card" content="summary_large_image">',
      ld(orgLd), ld(websiteLd), ...events.map(ld)
    ].join('\n'));
  fs.writeFileSync(path.join(out, 'index.html'), html);
  return events.length;
}

// ---------- build ----------
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const dir of ['data', 'media']) fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
const nEvents = home();
chapters.forEach(chapterPage);
eventsIndex();
ticketsPage();
partnersPage();
const urls = [['/', '1.0'], ['/tickets/', '0.9'], ['/chapters/', '0.9'], ['/partners/', '0.5'], ...chapters.map(c => [c.page, c.status === 'wrapped' ? '0.6' : '0.8'])];
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p]) => `  <url><loc>${SITE}${u}</loc><lastmod>${buildDate}</lastmod><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Built dist/ for ${SITE}: ${chapters.length} chapter pages, ${nEvents} with Google event data, sitemap with ${urls.length} URLs.`);
