# AbleShine World

Live site: https://ableshine.com.au (also ableshine-world.netlify.app; Netlify project `ableshine-world`, auto-deploys from `main`).

A 3D, third-person "event world" for AbleShine: free, all-abilities community days across Melbourne. Each event is a **chapter**: a striped festival tent on a story trail spiralling out from a plaza with a giant sun statue. Visitors walk a character (walking, wheelchair or cane, optional assistance dog) with **Sunny** the sun mascot floating beside them. Tapping a tent walks them along the trail and opens that chapter's **room**.

## Files

| Path | What it is |
|---|---|
| `index.html` | The whole app: HTML, CSS, JS in one file. No framework, no bundler. |
| `data/site.json` | **All content.** The single source of truth. Edit this to change the site. |
| `media/` | Logo, posters, event photos. |
| `scripts/build-seo.mjs` | Netlify build step. Writes `dist/`: the home page (SEO title and description, Organization/WebSite/Event JSON-LD, absolute share previews, pre-rendered cards linking to chapter pages); a static page per chapter at `/chapters/<id>/` (tickets, details, Easy Read, access, poster, photos, Facebook/Instagram, Event + Breadcrumb JSON-LD); an events index at `/chapters/`; a tickets page at `/tickets/` (every upcoming event with its Get tickets button); a partners page at `/partners/`; `sitemap.xml`; `robots.txt`. Statuses on static pages are computed at build time (Melbourne date). |
| `netlify.toml` | Build command, `dist` publish dir, cache headers. |
| `EDITING-GUIDE.txt` | Plain-English guide for the owner. |

External scripts (cdnjs): Three.js **r128** (global `THREE`) and JSZip 3.10.1. Fonts: Lilita One + Nunito (Google Fonts).

## Data model (`data/site.json`)

```
config:    title, tagline, mascotName, logoId (path), orgName, about,
           phone, rsvp (WhatsApp, falls back to phone), website, email, facebook, instagram,
           seoTitle, seoDescription (optional overrides for the home page)
events[]:  id (unique slug, also the page URL), name, date (YYYY-MM-DD or "" = TBC), time, venue, address,
           previousDate (text, shows a "date changed" banner), lineup[], easyRead[],
           access[] (ONLY confirmed access features), color (purple|pink|teal|amber),
           posterId (path), posterAlt, published (bool),
           ticketUrl (Eventbrite; "Get tickets" buttons until the date passes),
           facebookUrl (Facebook event), instagramUrl (Instagram post)
snapshots[]: eventId, assetId (path), caption, alt, createdAt (number = order)
partners[]:  name, type (Partner|Sponsor|Supporter…), logo (path), url, blurb
             (only organisations that have agreed to be named)
wellness:    name, tentName, about, offers[], note, address, hours, phone, email, url,
             instagram, facebook (the Artful Yoga wellbeing tent; remove the block to hide the tent)
```
Add fields; never rename existing ones.

## How the JS fits together (index.html)

- **`computeChapters()`**: published events, dated ones sorted by date then undated by name; numbered 01, 02…; status from the visitor's date: past `wrapped`, today `live`, first future `next`, later `upcoming`, no date `soon`. Never hard-code the number of events.
- **`refresh()`**: re-renders meta, guide, list cards, open room and lightbox; calls `W.layout()` only when the chapter signature changes.
- **`initWorld()`**: Three.js scene. `layout(chapters)` rebuilds the island (radius grows with chapter count), CatmullRom story trail, `tent()` per chapter (status-specific dressing), instanced pop-art trees, flowers, floating stars and hearts, lilac skyline, plus the HTML labels (`buildLabels`). The avatar, dog, Sunny (`mascot()`), statue, camera, input and the `frame()` loop live here too.
- **Navigation**: `goChapter(id)` walks the trail (`W.travel`), then `openRoom(id)`. List view or no WebGL opens the room directly. Hash routes are `#ch-<event id>`, `#play`, `#magic`, `#wellness`, `#partners` (walk to the tent), `#tickets`, `#zones` and `#our-partners`.
- **Landmark tents** (`SPECIALS`, `liveSpecials()`, `specialTent()` in `layout`): the **Partners pavilion** (navy and gold pyramid with a logo board drawn from `partners[]`) and the **Play Tent** (pink and yellow candy big top) sit beside the plaza. The **Magic Tent** (starry wizard hat, radius 31) and the **wellbeing tent** (green lotus pavilion from `wellness`, radius 44) sit further out, each on its own stepping-stone path from the plaza ring (`sp.gate`, `sp.walk`). The crowd uses those paths as "spurs". `goSpecial(kind)` walks there (`W.travelSpecial`), then `openSpecial(kind)` opens `#special` (`renderSpecial`). They're listed under "Around the island" in the guide and as cards in List view.
- **Games** (`GAMES` with a `zone` of `play` or `magic`, `openGame`, `gLoop`, `#game` overlay). Play Tent: Bubble Pop, Glow Painter, Music Pads (real buttons, keys 1–8) and Breathe with Sunny (4s in / 2s hold / 6s out, phase announced via aria-live). Magic Tent (`setupMagic`): Magic Hat, Vanishing Card, Cup Shuffle (DOM buttons, keys 1–3, Slow, Show me) and Wand Reveal (scratch-off mist, Reveal it). `DOMGAMES` lists the games that use DOM instead of the canvas. No scores, timers or fail states. Soft WebAudio pentatonic notes, Sound toggle (localStorage `asw.sound`), Calm mode halves speeds and turns off vibration. The 3D loop pauses while a game is open.
- **Tent toppers** (`topper`, `chapterTopper`, `iconTopper` in `initWorld`): camera-facing canvas medallions above every tent (`TOPICON`: chapter number; navy star for Partners; candy note for Play; purple moon for Magic; green lotus for wellbeing). They fade when the camera is close. Plus `haloRing` and `signBoard` on the grass. Keep each tent visually distinct.
- **Quick tickets** (`openTickets`/`renderTickets`, `#tickets` sheet): the top-bar "Get tickets" lists every upcoming chapter with its own ticket button. It's for visitors who don't want the tour.
- **Page views** (`openPage(kind)`/`renderPage`, `#pageview`): full-screen pages in the List-view layout. `zones` groups every tent by zone (open directly, Walk there in 3D, games playable directly); `partners` is the in-app partners page. Opening one adds `body.paging`, which hides the bottom bar and pauses the 3D loop.
- **Panels**: room (`renderRoom`), Chapter guide, Connect (`renderConnect`), landmark panel (`renderSpecial`), tickets, page view, Me popover, lightbox, game. Escape closes the top panel.
- **Avatar** (`person`, `poseAvatar`, `W.gesture`): body group (lean, roll, breathing), head group (look-around, tilt) with blinking eyes, hands, shoes, hood and badge. Gestures (`GESTURES`: wave, cheer, clap, dance) come from the Me panel, tapping the avatar, and a quiet wave on arrival. In Calm mode, gestures hold a still pose.
- **Bunting and bobbers** (`bunting`, `ringSegs`, `spokes`, `bobbers`): instanced pennants on strings (3 calls) and instanced bobbing spheres. Use them for tent dressing.
- **Prefs** (localStorage `asw.*`): calm, big text, list view, character choices.
- **Walking crowd** (`npcModel`, `npcDog`, `buildCrowd`, `stepCrowd`): 6 + one per chapter (max 12) visitors (walking, wheelchair, cane; two with assistance dogs) walk a ring around the plaza edge (radius 11.5) and the story trail between tent doors, pausing at each. Built per layout. Each is about 6 draw calls (`mergeParts`/`bodyMesh` merge static parts with vertex colours). Calm mode freezes them; low quality hides half.
- **Performance rules:**
  - Repeated things are instanced: trees, skyline, clouds, scallops, balloons, flowers, trail stones.
  - Floaters are `Points`. Labels only write to the DOM when a value changes.
  - `disposeTree` frees everything a re-layout throws away. Cached textures and the shared `OUT` outline material carry `userData.keep`.
  - Leaving List view does not re-layout.
  - Pixel ratio is capped at 1.5.
  - Adaptive quality (`W.sampleQuality`): after load, if frames average over 34ms, it drops shadows, uses pixel ratio 1 and halves the crowd. `localStorage asw.quality` = `"high"`/`"low"` forces it (for testing).
  - JSZip is loaded only when someone taps "Download all".

  Baseline before 1.2.0 was about 430 draw calls and 345k triangles; 1.2.0 was 293 calls and 181k. Keep new scenery instanced.
- **Icons** (`ICONS`, `icon(name, size, fill)`): inline SVG for labels, guide and zone cards. Don't use font glyphs (★ ♫), which render inconsistently.

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

`main` is production. Netlify runs `node scripts/build-seo.mjs` and publishes `dist/`. `dist/` is git-ignored. To check locally, run `node scripts/build-seo.mjs` and serve `dist/` (opening the file directly breaks textures).

## Versions and releases

- Work on a branch (`feature/…`, `fix/…`, `content/…`) and open a pull request into `main`. Netlify builds a **deploy preview** for every PR. Previews need a Netlify team login; production is public.
- Fill in the PR checklist (`.github/pull_request_template.md`). Pick PATCH (content/fixes), MINOR (new feature) or MAJOR (big new area/redesign), and move the `[Unreleased]` notes in `CHANGELOG.md` under the new version.
- After merging, create a GitHub Release on `main` named `vX.Y.Z` with the changelog notes. Tags can't be pushed from Claude sessions, so releases are made on GitHub.
- Small content-only edits to `data/site.json` may go straight to `main` as a PATCH. Note them in `CHANGELOG.md` with the next PR.

## Known gaps / next work

1. Content still missing:
   - Melton time
   - Wyndham time and venue
   - Chapters 5 and 6
   - Maribyrnong poster and photos
   - Confirmed `access` per venue
2. Self-serve admin (Decap CMS at `/admin` editing `data/site.json`). The old in-page Studio code was removed in 1.2.0.
3. Videos per chapter: an optional `videos[]` with click-to-load YouTube-nocookie or Vimeo, or `<video>` with captions. Never autoplay.
4. Performance: Netlify Image CDN for photo thumbnails once event photos are added. Three.js r128 is the biggest download (~600KB, ~150KB gzipped from cdnjs).
5. Media consent: anyone pictured must have consented; the takedown note in each room must reach a real person.
6. **Security pass (next, before the back end):**
   - HTTPS on ableshine.com.au (Netlify certificate). Then add security headers in `netlify.toml`: HSTS, a CSP allowing cdnjs, Google Fonts, and `data:` images (the magic games draw icons from data: SVGs), X-Frame-Options or frame-ancestors, Referrer-Policy and Permissions-Policy.
   - Check every external link and script.
   - Back end (admin and content editor) built with sign-in and roles from the start.
7. Confirm with Artful Yoga Gallery that they agree to be named, and that they offer the sessions listed in `wellness.offers`. Disability healing and tarot are not on their website; the owner supplied them.
