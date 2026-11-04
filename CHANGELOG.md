# Changelog

All notable changes to AbleShine World (ableshine.com.au).
Versions follow **MAJOR.MINOR.PATCH**:

- **MAJOR**: a big new area of the world or a redesign (e.g. 1.0.0 added the landmark tents).
- **MINOR**: a new feature visitors will notice (e.g. tickets, chapter pages, video strip).
- **PATCH**: content updates and fixes (new chapter details, links, wording, bug fixes).

## [Unreleased]

### Added
- This changelog, a pull request checklist, and a release process in CLAUDE.md.

### Changed
- Melton and Whittlesea ticket buttons now use the branded links ableshinemelton.eventbrite.com.au and ableshinewhittlesea.eventbrite.com.au (same events). Shipped straight to main in 0708daa.

## [1.0.0] - 2026-11-02

Commit e941284.

### Added
- **Partners pavilion** beside the plaza. A logo board and a panel are driven by `partners[]` in `site.json`, with a "Partner with AbleShine" call to action. There's also a static `/partners/` page.
- **Play Tent** (rainbow dome) with four sensory games: Bubble Pop, Glow Painter, Music Pads and Breathe with Sunny.
  - No scores or timers.
  - Optional soft sound; Calm mode aware.
  - Keyboard and screen-reader friendly.
- "Around the island" section in the Chapter guide and List view, plus `#play` and `#partners` links.

### Changed
- Contact details: website www.ableshine.com.au and email connect@ableshine.com.au.

## [0.3.0] - 2026-11-02

Commits 87522fd to 0aa7b76.

### Added
- Per-chapter `ticketUrl` (Eventbrite), `facebookUrl` and `instagramUrl`.
- "Get tickets" next to each chapter name and in the top bar for the next event.
- A Share button in each room.
- A static page for every chapter at `/chapters/<id>/`.
- An events index, `sitemap.xml` and `robots.txt`.
- Event, Breadcrumb, Organization and WebSite structured data.
- Eventbrite links for Melton and Whittlesea, plus the Facebook and Instagram pages (@ableshineau).

### Changed
- Contact phone is now 0485 755 553.

## [0.2.0] - 2026-11-02

Commits 299778e to 7a02976.

### Changed
- The "Access on the day" section now shows only access features confirmed for each venue (`access[]`).
- `data/site.json` is the single data source, with a friendly retry state if it fails to load.

### Added
- Netlify build step: pre-rendered chapter cards, schema.org Event data and absolute share previews.
- CLAUDE.md and the editing guide.

## [0.1.0] - 2026-11-02

Commit 129d403.

### Added
- First AbleShine World: a 3D pop-art island where each event is a chapter tent on a story trail.
- Chapter rooms, Sunny the guide, list view and Connect.
- Calm mode, larger text, and a character choice of walking, wheelchair or cane, with an optional assistance dog.
