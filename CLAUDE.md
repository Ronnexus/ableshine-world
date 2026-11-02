# AbleShine World

Live site: https://ableshine-world.netlify.app (Netlify project `ableshine-world`, auto-deploys from `main`).

A 3D, third-person "event world" for AbleShine: free, all-abilities community days across Melbourne. Each event is a **chapter**: a striped festival tent on a story trail spiralling out from a plaza with a giant sun statue. Visitors walk a character (walking, wheelchair or cane, optional assistance dog) with **Sunny** the sun mascot floating beside them. Tapping a tent walks them along the trail and opens that chapter's **room**.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole app: HTML, CSS, JS in one file. No framework, no bundler. |
| `data/site.json` | **All content.** The single source of truth. Edit this to change the site. |
| `media/` | Logo, posters, event photos. |
| `scripts/build-seo.mjs` | Netlify build step. Copies the site to `dist/`, pre-renders chapter cards, adds schema.org Event data and absolute share-preview URLs. |
| `netlify.toml` | Build command, `dist` publish dir, cache headers. |
| `EDITING-GUIDE.txt` | Plain-English guide for the owner. |

External scripts (cdnjs): Three.js **r128** (global `THREE`) and JSZip 3.10.1. Fonts: Lilita One + Nunito (Google Fonts).

## Data model (`data/site.json`)

```
config:    title, tagline, mascotName, logoId (path), orgName, about,
           phone, rsvp (WhatsApp, falls back to phone), website, email, facebook, instagram
events[]:  id (unique slug), name, date (YYYY-MM-DD or "" = TBC), time, venue, address,
           previousDate (text, shows a "date changed" banner), lineup[], easyRead[],
           access[] (ONLY confirmed access features), color (purple|pink|teal|amber),
           posterId (path), posterAlt, published (bool)
snapshots[]: eventId, assetId (path), caption, alt, createdAt (number = order)
```
Add fields; never rename existing ones.

## How the JS fits together (index.html)

- **`computeChapters()`**: published events, dated ones sorted by date then undated by name; numbered 01, 02…; status from the visitor's date: past `wrapped`, today `live`, first future `next`, later `upcoming`, no date `soon`. Never hard-code the number of events.
- **`refresh()`**: re-renders meta, guide, list cards, open room and lightbox; calls `W.layout()` only when the chapter signature changes.
- **`initWorld()`**: Three.js scene. `layout(chapters)` rebuilds the island (radius grows with chapter count), CatmullRom story trail, `tent()` per chapter (status-specific dressing), instanced pop-art trees, flowers, floating stars and hearts, lilac skyline, plus the HTML labels (`buildLabels`). The avatar, dog, Sunny (`mascot()`), statue, camera, input and the `frame()` loop live here too.
- **Navigation**: `goChapter(id)` walks the trail (`W.travel`), then `openRoom(id)`. List view or no WebGL opens the room directly. Hash routes are `#ch-<event id>`.
- **Panels**: room (`renderRoom`), Chapter guide, Connect (`renderConnect`), Me popover, lightbox. Escape closes the top panel.
- **Prefs** (localStorage `asw.*`): calm, big text, list view, character choices.
- **Dormant code**: Studio, upload and photo-edit functions (`S.canEdit`, `S.db`, `S.assets`, `renderStudio`, `eventForm`, `settingsForm`, `uploadSnaps`, `deleteSnap`) are left from the original claude.ai version and never run here (`S.canEdit = false`). Remove them when the CMS admin replaces them.

## Must not change

- **Look:** ink #22114A outlines, purple #4B1F9E/#5B2DB0, pink #E0187A (UI #D3166F), yellow #FFC72C, sky blue #1FA9E1, lime #7CCB52, Lilita One + Nunito, halftone screen edges, candy-stripe tents, Ben-Day-dot pop-art trees, Sunny.
- **Accessibility (core, not extras):**
  - Chapter guide and List view give everything without 3D.
  - Calm mode and `prefers-reduced-motion` stop all motion; travel teleports.
  - A+ text size, 44px touch targets, visible focus rings, real buttons and links.
  - Alt text, an aria-live status line, Easy Read in every room.
- **Honesty:** never invent dates, venues, times, prices or access features. Missing info shows "To be confirmed" or "Coming soon". `access[]` lists only what is confirmed for that venue.
- **Brand:** public name "AbleShine". Never use "Foundation". Australian English, plain words.

## Deploy

Push to `main`. Netlify runs `node scripts/build-seo.mjs` and publishes `dist/`. `dist/` is git-ignored. To check locally, run `node scripts/build-seo.mjs` and serve `dist/` (opening the file directly breaks textures).

## Known gaps / next work

1. Content still missing:
   - Melton time
   - Wyndham time and venue
   - Chapters 5 and 6
   - Real phone, website and email
   - Maribyrnong poster and photos
   - Confirmed `access` per venue
2. Self-serve admin (Decap CMS at `/admin` editing `data/site.json`); then remove the dormant Studio code.
3. Videos per chapter: an optional `videos[]` with click-to-load YouTube-nocookie or Vimeo, or `<video>` with captions. Never autoplay.
4. Performance: adaptive quality on low-end phones (pixel ratio, shadows); Netlify Image CDN for thumbnails; dispose materials and textures on re-layout.
5. Media consent: anyone pictured must have consented; the takedown note in each room must reach a real person.
