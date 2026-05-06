# Turkey Loop — Project Briefing Document
> Handoff document for coding agent. Contains the full design conversation, project objective, system design, and implementation plan.

---

## Background

This document summarizes a full product design conversation between the project owner (Fernando) and Claude. Its purpose is to brief a coding agent on everything needed to implement the **Turkey Loop** travel photography website from scratch, without any prior context.

---

## 1. Project Objective

### What it is
A public, single-page web application hosted on GitHub Pages that documents a personal road trip loop around Turkey. It serves as both a travel journal and a photo showcase, combining an interactive map with destination-specific photo galleries and short narratives.

### Core Features

**Interactive Map**
- Full-page map of Turkey rendered using Leaflet.js with OpenStreetMap tiles (open source, no API key required)
- A drawn route connecting destinations in travel order, forming a visible loop
- Route pre-computed via OSRM public API, stored as `route.geojson` in the repo (no runtime routing API calls)

**Destination Markers**
- One marker per city/stop along the route (~10 destinations)
- Each marker displays the destination name and photo count
- Markers are styled with a custom icon

**Photo Galleries**
- Clicking a marker opens a modal overlay
- Modal shows a thumbnail grid of all photos for that destination
- Clicking a thumbnail opens a full-screen lightbox with prev/next navigation and keyboard support
- Photos hosted in the GitHub repository under `/photos/<slug>/`

**Destination Content**
- Each destination has a title and a short description (max ~200 words)
- Displayed within the gallery modal, above the photo grid

**Layout**
- Fixed header (trip title + subtitle)
- Map fills the viewport between header and footer
- Fixed footer (attribution + GitHub link)

### Technical Constraints

| Dimension | Decision |
|---|---|
| Delivery format | Single HTML file + asset folder structure |
| Hosting | GitHub Pages (free, static) |
| Map library | Leaflet.js (open source) |
| Map tiles | OpenStreetMap |
| Photo storage | GitHub repository (`/photos/<city-slug>/`) |
| Route input | Pre-computed via OSRM, stored as `route.geojson` |
| No backend | Fully static — no server, no database |
| No build tools | Vanilla HTML/CSS/JS |
| Config format | `data.js` — a plain JS module, single source of truth |

### Out of Scope (v1)
- User authentication or comments
- Real-time location tracking
- Mobile app
- Multilingual support
- Automated photo upload pipeline

### Success Criteria
A visitor can open the site, see the full Turkey loop route on a map, click any destination, read a short description, browse a thumbnail grid, and view individual photos full-screen — all without leaving the page. Adding a new destination or photos requires only dropping files into the repo and updating `data.js`.

---

## 2. System Design

### Repository Structure

```
turkey-loop/
│
├── index.html                  ← Single page application shell
├── style.css                   ← All visual styling
├── data.js                     ← Single source of truth for all content
│
├── photos/
│   ├── istanbul/
│   │   ├── 001.jpg
│   │   ├── 002.jpg
│   │   └── manifest.json       ← Auto-generated, not hand-written
│   ├── gallipoli/
│   │   └── manifest.json
│   └── (one folder per destination; slug must match data.js id)
│
├── route.geojson               ← Pre-computed road geometry (generated once)
│
├── assets/
│   └── marker-icon.svg         ← Custom map marker
│
└── scripts/                    ← Local helper scripts, never deployed
    ├── generate-manifests.js   ← Scans /photos/, writes manifest.json per folder
    └── generate-route.js       ← Calls OSRM API, writes route.geojson
```

### Component Architecture

```
┌─────────────────────────────────────────────┐
│  HEADER (fixed top)                         │
│  Trip title · subtitle · nav links          │
├─────────────────────────────────────────────┤
│                                             │
│  MAP LAYER (Leaflet.js)                     │
│  ├── Route line (from route.geojson)        │
│  └── Destination markers (from data.js)     │
│       └── on click → triggers MODAL         │
│                                             │
├─────────────────────────────────────────────┤
│  FOOTER (fixed bottom)                      │
│  Small credit / GitHub link                 │
└─────────────────────────────────────────────┘

         ┌──────────────────────────┐
         │  MODAL OVERLAY           │
         │  ├── Destination title   │
         │  ├── Description text    │
         │  ├── Thumbnail grid      │  ← from manifest.json
         │  └── on thumb click →   │
         │       LIGHTBOX           │
         └──────────────────────────┘

                   ┌────────────────┐
                   │  LIGHTBOX      │
                   │  Full image    │
                   │  ← prev next → │
                   └────────────────┘
```

### Data Flow

```
data.js (destinations + coords + text)
    │
    ├──▶ Leaflet renders markers on map
    │
    └──▶ on marker click:
              │
              ├── fetch photos/<slug>/manifest.json
              │        └──▶ render thumbnail grid in modal
              │
              └── display title + description from data.js
                       └──▶ on thumbnail click:
                                  └──▶ open lightbox, enable prev/next
```

Runtime network calls are limited to:
- OpenStreetMap tiles (map background)
- `manifest.json` per destination (on demand, from same GitHub repo)

### Key Files

#### `data.js` — The only file edited to add/change destinations
```js
const TRIP = {
  title: "Turkey Loop",
  subtitle: "April–May 2026",
  destinations: [
    {
      id: "istanbul",           // must match /photos/istanbul/ folder name
      name: "Istanbul",
      coords: [41.008, 28.978], // [lat, lng]
      order: 1,                 // controls route drawing order
      description: "Your 200-word text here."
    },
    // ...
  ]
}
```

#### `manifest.json` (per destination, auto-generated)
```json
{
  "photos": ["001.jpg", "002.jpg", "003.jpg"]
}
```
Generated by `scripts/generate-manifests.js`. Run locally after adding photos, then commit.

#### `route.geojson`
GeoJSON LineString of the full road route. Generated once by `scripts/generate-route.js`, which reads destination coordinates from `data.js` in order and calls the OSRM public API. Committed to the repo.

### Dependencies (all via CDN, no install required for the site)

| Library | Purpose | License |
|---|---|---|
| Leaflet.js | Map rendering and interaction | BSD 2-Clause |
| OpenStreetMap tiles | Map background imagery | ODbL |
| Vanilla JS | Gallery/lightbox — no extra library needed | — |

### Helper Scripts (Node.js, run locally before committing)

| Script | When to run | What it does |
|---|---|---|
| `generate-manifests.js` | Every time photos are added | Scans `/photos/<slug>/`, writes `manifest.json` per folder |
| `generate-route.js` | Once, or when destinations change | Reads coords from `data.js`, calls OSRM, writes `route.geojson` |

Both exposed as npm scripts:
- `npm run generate-manifests`
- `npm run generate-route`

Node 18+ required (uses built-in `fetch`).

---

## 3. Implementation Plan

### Guiding Principle
Every task is executed by the coding agent. The only manual actions by the project owner are pasting photos into folders and filling in text content in `data.js`.

---

### Phase 3.1 — Repository Bootstrap
- Initialize Git repository
- Create full folder structure (`/photos`, `/scripts`, `/assets`, placeholder `.gitkeep` files)
- Create `README.md` with project description, setup instructions, and content workflow
- Create `.gitignore` (exclude `node_modules`, OS files, etc.)
- Configure GitHub Pages deployment
- Create `CONTENT_GUIDE.md` — plain-language guide explaining how to add destinations and photos, including a full tutorial on editing `data.js`

---

### Phase 3.2 — Data Layer
- Create `data.js` with full structure and ~10 placeholder destinations
- Validate coordinate format against Leaflet expectations
- Create `route.geojson` as an empty valid GeoJSON placeholder

---

### Phase 3.3 — Helper Scripts
- Write `scripts/generate-manifests.js`
  - Scans each subfolder of `/photos/`
  - Filters for image files only (`.jpg`, `.jpeg`, `.png`, `.webp`)
  - Writes `manifest.json` per destination folder
  - Logs summary to console
- Write `scripts/generate-route.js`
  - Reads destination coordinates from `data.js` in order
  - Calls OSRM public API for sequential waypoint routing
  - Writes result as `route.geojson`
  - Handles API errors gracefully
- Add both as npm scripts in `package.json`

---

### Phase 3.4 — Frontend: Shell & Layout
- `index.html` shell with semantic structure (header, main, footer)
- Fixed header with trip title, subtitle, minimal nav
- Fixed footer with attribution and GitHub link
- Map container fills viewport between header and footer
- Responsive CSS for desktop and mobile
- Modal overlay — full DOM structure, hidden by default, toggled by JS
- Lightbox overlay — full DOM structure, hidden by default, toggled by JS

---

### Phase 3.5 — Frontend: Map Layer
- Initialize Leaflet map centered on Turkey
- Load and draw `route.geojson` as a styled polyline
- Load destinations from `data.js` and place custom markers
- Each marker displays destination name and photo count (read from manifest)
- Marker click handler opens the modal for that destination

---

### Phase 3.6 — Frontend: Gallery & Lightbox
- Modal dynamically populated from `data.js` (title, description) and `manifest.json` (photo list)
- Thumbnail grid rendered from manifest photo list
- Thumbnail click opens lightbox at correct index
- Lightbox: full-size image, prev/next navigation, keyboard arrow support, click-outside-to-close
- Modal: ESC key closes, click-outside closes, scrollable for long photo sets

---

### Phase 3.7 — CI/CD & Deployment
- Create `.github/workflows/deploy.yml`
  - Triggers on push to `main`
  - Deploys repo root to GitHub Pages automatically
- Validate no build step is needed (pure static)
- Create `DEPLOYMENT.md` documenting the live URL and redeployment process

---

### Phase 3.8 — Testing & QA
- Map loads and centers on Turkey correctly
- Route line draws from `route.geojson`
- All markers appear at correct coordinates
- Modal opens with correct content per destination
- Lightbox opens, navigates, and closes correctly
- Manifest generator produces valid JSON
- Route generator produces valid GeoJSON
- GitHub Actions workflow completes without error
- Site is live and accessible at GitHub Pages URL

---

### Phase 3.9 — Content Handoff
- Confirm `data.js` is ready for real destination data
- Confirm `/photos/<slug>/` folder structure matches slugs in `data.js`
- **[Manual]** Project owner pastes photos into correct folders
- Agent runs `npm run generate-manifests`
- Agent runs `npm run generate-route`
- Final commit and push — site goes live

---

### Execution Order

```
3.1 Repo Bootstrap
 └─▶ 3.2 Data Layer
      └─▶ 3.3 Helper Scripts
           └─▶ 3.4 Frontend Shell
                └─▶ 3.5 Map Layer
                     └─▶ 3.6 Gallery & Lightbox
                          └─▶ 3.7 CI/CD
                               └─▶ 3.8 Testing
                                    └─▶ 3.9 Content Handoff
```

---

## 4. Project Owner Manual Actions (complete list)

| When | Action |
|---|---|
| Before Phase 3.2 | Decide the ~10 destinations and travel order |
| Before Phase 3.9 | Paste photos into `/photos/<slug>/` folders |
| Ongoing | Write ~200-word descriptions per destination (can be done directly in `data.js` or dictated to the agent) |

---

## 5. Suggested Kickoff Prompt for Coding Agent

> "You are implementing the Turkey Loop travel photography website. The full project specification is in this document. Please execute Phase 3.1 first: bootstrap the repository structure exactly as specified, including all placeholder files, README.md, CONTENT_GUIDE.md, and .gitignore. Do not write any frontend code yet. Confirm when Phase 3.1 is complete before proceeding."

Then proceed phase by phase, confirming completion before moving to the next.
