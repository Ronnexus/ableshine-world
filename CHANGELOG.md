# Changelog

All notable changes to AbleShine World (ableshine.com.au).
Versions follow **MAJOR.MINOR.PATCH**:

- **MAJOR**: a big new area of the world or a redesign (e.g. 1.0.0 added the landmark tents).
- **MINOR**: a new feature visitors will notice (e.g. tickets, chapter pages, video strip).
- **PATCH**: content updates and fixes (new chapter details, links, wording, bug fixes).

## [Unreleased]

## [1.2.0] - 2026-11-04

### Added
- **A walking crowd.** Ten visitors walk around the plaza and along the story trail between tents, pausing at each one. They include people walking, wheelchair users and cane users, two have assistance dogs, and their hair and clothes vary. The crowd grows with the number of chapters. Calm mode freezes them.

### Changed
- **Partners and Play Tent labels redesigned.** Proper icon tiles (navy star, rainbow music note) replace the small text symbols. Clear sub-lines ("Sponsors and supporters", "Sensory games"). Matching icon medallions float above the tents instead of the duplicate "PARTNERS" and "PLAY" text badges.
- Icons in the Chapter guide, List view and Zones cards are now drawn as SVG, so they look the same on every device.
- Tent number medallions fade when the camera is right next to them, so they never block the view.

### Performance
- **About a third fewer draw calls (431 → 293) and half the triangles (345k → 181k), with the new crowd included.**
  - Trees use lighter shapes.
  - Repeated scenery is drawn as one instance each: the skyline (135 → 8 calls), clouds, floating stars and hearts, tent scallops and balloons.
  - Sunny (statue and guide) is built from about 7 parts instead of about 40.
- The static crowd at past events is gone (it grew with every event). The walking crowd replaces it.
- **Adaptive quality:** devices that can't hold about 30fps drop shadows and extra sharpness and show half the crowd.
- Pixel ratio capped at 1.5 (phones were rendering up to 2×).
- The download-all library (JSZip, 98KB) only loads when someone taps "Download all".
- Logo is 66KB → 12KB with no visible change.
- Switching back from List view no longer rebuilds the whole island, and everything a rebuild throws away is now freed. Memory use dropped about 30%.

### Removed
- Unused code from the original claude.ai version: the in-page Studio editor, photo uploads, photo editing and their styles. None of it ran on the live site.

## [1.1.0] - 2026-11-04

### Added
- **Get tickets, no tour needed.** The top-bar button opens a list of every upcoming event, each with its own Get tickets and Details buttons (it was only "Get tickets: Melton"). It's also in the welcome hint and List view, at `#tickets`, and as a shareable page at ableshine.com.au/tickets. The WhatsApp number shows for events without a ticket link yet.
- **Zones** button: a List-view-style page grouping every tent:
  - Event tents
  - Play zone, with each game playable straight away
  - Partners zone
  - Sunshine Square and help

  Each one can be opened directly or walked to in 3D, at `#zones`.
- **Partners page in the List-view layout** (`#our-partners`), opened from the Partners tent's "See all partners" button.
- Tents that stand out:
  - Every tent has a floating topper above it: a numbered medallion for chapters, a marquee badge for Partners and a rainbow badge for Play.
  - Bold halo rings and named signboards on the grass, brighter fabric, and a clear lawn around each tent.
  - Partners is now a navy-and-gold pavilion with a red carpet and spotlights.
  - The Play Tent has crossed rainbow arches and sensory balls.
- This changelog, a pull request checklist, and a release process in CLAUDE.md.

### Fixed
- Status chips on list cards were hard to read.
- Page views sat under the wrapped top bar on phones.

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
