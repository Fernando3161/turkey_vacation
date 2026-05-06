# Turkey Loop - Day-Based Project Briefing Document

> Handoff document for a coding agent. This document replaces the earlier destination-based briefing and adapts the website around daily travel entries, category-based photo folders, curated map pins, and a cleaner public route.

---

## Background

This project documents Fernando's Turkey road trip as a public, single-page travel photography website. The original concept was destination-based, with one marker and one gallery per city or stop. The revised concept is day-based: each travel day has its own map pin, short narrative, and photo gallery.

The key design change is that the website should not treat Istanbul, Gallipoli, Cappadocia, or other places only as broad destinations. Instead, it should treat each day as a distinct travel entry. This is especially important for Istanbul, where different days had different themes, such as arrival, Topkapi Palace, Hagia Sophia, the Theodosian Walls, Kadikoy, islands, or museum visits.

Each day contains photos divided into three categories:

- People
- Places
- Cats

The visitor can open a day from the map and use filter buttons in the modal overlay to display all photos or only one category.

The map should show a curated route and meaningful pins, not a complete Google Maps location history trace. Hotel commutes, airport transfers, repeated walks, and private movements should be removed from the public presentation.

---

## 1. Project Objective

### What it is

A public, single-page web application hosted on GitHub Pages that documents a personal Turkey loop trip as a day-by-day visual travel journal.

The application combines:

- An interactive map of Turkey
- A curated route line showing the trip loop
- One marker per travel day or meaningful day segment
- A modal overlay for each day
- A short daily narrative
- A photo gallery with People, Places, and Cats filters
- A full-screen lightbox for individual photos

### Core Features

#### Interactive map

- Full-page map of Turkey using Leaflet.js.
- OpenStreetMap tiles, with no API key required.
- A curated route connecting the main trip stops in travel order.
- Route geometry stored as `route.geojson` in the repository.
- No runtime routing API calls in the deployed site.
- Optional future support for selected day-specific walking traces.

#### Day markers

- One marker per travel day.
- Each marker corresponds to a `day` entry in `data.js`.
- The marker should use a meaningful coordinate for that day, such as Topkapi Palace, Gallipoli, Troy, Pamukkale, Goreme, or Kadikoy.
- Markers should show the day number, title, location label, and photo count.
- Markers should be styled with a custom icon.

#### Day gallery modal

Clicking a marker opens a modal overlay with:

- Day number
- Date
- Day title
- Location label
- Short description
- Optional short note or highlight
- Photo category filters
- Thumbnail grid

The filter buttons should be:

- All
- Places
- People
- Cats

The default filter should be All.

Each filter button should optionally show the photo count:

```text
All 42 | Places 25 | People 9 | Cats 8
```

#### Photo organization

Photos are stored by day, then by category:

```text
turkey-loop/
  photos/
    day-00-istanbul-arrival/
      people/
      places/
      cats/
      manifest.json

    day-01-istanbul-topkapi-palace/
      people/
      places/
      cats/
      manifest.json

    day-06-gallipoli/
      people/
      places/
      cats/
      manifest.json
```

Each day has one `manifest.json` file that lists photos by category.

#### Lightbox

Clicking a thumbnail opens a full-screen lightbox with:

- Full-size image
- Previous and next navigation
- Keyboard navigation using left and right arrows
- Escape key to close
- Click-outside or close button support
- Optional current image counter

#### Layout

- Fixed header with trip title and subtitle.
- Map fills the viewport between header and footer.
- Fixed footer with attribution and optional GitHub link.
- Modal and lightbox are hidden by default and controlled by JavaScript.
- Responsive layout for desktop and mobile.

---

## 2. Technical Constraints

| Dimension | Decision |
|---|---|
| Delivery format | Static single-page web application |
| Hosting | GitHub Pages |
| Map library | Leaflet.js |
| Map tiles | OpenStreetMap |
| Photo storage | GitHub repository under `/photos/<day-slug>/<category>/` |
| Route input | Pre-computed GeoJSON stored as `route.geojson` |
| Runtime routing | None |
| Backend | None |
| Database | None |
| Build tools | None for v1 |
| Frontend stack | Vanilla HTML, CSS, and JavaScript |
| Content source | `data.js` as the single source of truth |
| Photo manifests | Auto-generated JSON files per day |

### Why vanilla JS is still recommended

The project is mostly static content, a map, modals, filters, and a lightbox. A React, Vue, Astro, or CMS setup would add complexity before it adds value.

For the weekend version, the best stack remains:

- GitHub Pages
- Leaflet.js
- OpenStreetMap tiles
- Vanilla JavaScript
- Static folder-based photo organization
- Helper scripts run locally before committing

Astro or another framework can be considered later if the project grows into a long-form travel blog with individual pages, markdown entries, SEO needs, or multilingual content.

---

## 3. Out of Scope for v1

The following features should not be implemented in the first version:

- User authentication
- Comments
- Real-time location tracking
- Full Google Maps history display
- Automated GPS trace import
- Per-photo geotag extraction
- Captions for every photo
- Search
- Multilingual support
- Image compression pipeline
- CMS integration
- Timeline slider
- Mobile app

---

## 4. Success Criteria

A visitor can open the site and understand the Turkey trip visually.

The visitor should be able to:

1. See the full Turkey loop on a map.
2. See day-based markers along the route.
3. Click a marker for a specific day.
4. Read a short day description.
5. Browse all photos for that day.
6. Filter photos by People, Places, or Cats.
7. Open individual photos in a full-screen lightbox.
8. Navigate between photos without leaving the page.

The project owner should be able to add new content by:

1. Creating a new day folder under `/photos/`.
2. Adding photos into `people`, `places`, and `cats` subfolders.
3. Updating the corresponding day entry in `data.js`.
4. Running the manifest generator.
5. Committing the updated files.

---

## 5. Public Map Strategy

### Guiding principle

The public map should be a curated travel map, not a raw personal movement log.

### Recommended approach

Use a reduced and intentional representation of the trip:

- Main long-distance route between cities and overnight stops.
- One representative pin per day.
- Optional selected walking traces only when the walk itself is part of the story.
- No hotel commutes unless the hotel itself is relevant.
- No repeated transit to and from accommodation.
- No private or unnecessary movement history.

### What to use from Google Maps history

Google Maps history can be used during content preparation as a reference for:

- Confirming dates and movements.
- Recovering the order of places visited.
- Selecting meaningful pins.
- Reconstructing special walks or ferry trips.

It should not be published directly as the main route.

### Public route layers

For v1, implement one route layer:

```text
route.geojson
```

This should show the broad Turkey loop, connecting the main route stops in travel order.

For a later version, optional extra day traces can be added:

```text
traces/
  day-15-theodosian-walls.geojson
  day-17-princes-islands.geojson
```

These optional traces should be used only for meaningful walking, hiking, ferry, or cultural route days.

---

## 6. Repository Structure

```text
turkey-loop/
|
|-- index.html
|-- style.css
|-- data.js
|-- route.geojson
|-- package.json
|-- README.md
|-- CONTENT_GUIDE.md
|-- DEPLOYMENT.md
|-- .gitignore
|
|-- assets/
|   |-- marker-icon.svg
|   |-- marker-icon-active.svg
|   |-- favicon.svg
|
|-- photos/
|   |-- day-00-istanbul-arrival/
|   |   |-- people/
|   |   |   |-- .gitkeep
|   |   |-- places/
|   |   |   |-- .gitkeep
|   |   |-- cats/
|   |   |   |-- .gitkeep
|   |   |-- manifest.json
|   |
|   |-- day-01-istanbul-topkapi-palace/
|   |   |-- people/
|   |   |-- places/
|   |   |-- cats/
|   |   |-- manifest.json
|   |
|   |-- day-06-gallipoli/
|   |   |-- people/
|   |   |-- places/
|   |   |-- cats/
|   |   |-- manifest.json
|
|-- traces/
|   |-- .gitkeep
|
|-- scripts/
|   |-- generate-manifests.js
|   |-- generate-route.js
|   |-- validate-data.js
|
|-- .github/
|   |-- workflows/
|       |-- deploy.yml
```

### Notes on folder names

- Day folders must match the `id` field in `data.js`.
- Use lowercase slugs.
- Use ASCII slugs for folder names, even when the display title includes Turkish characters.
- Example: use `day-01-istanbul-topkapi-palace` as the folder name, but display `Topkapı Palace` in the interface.

---

## 7. Component Architecture

```text
HEADER
  Trip title
  Subtitle
  Optional compact controls

MAP LAYER
  Leaflet map
  Route line from route.geojson
  Day markers from data.js
  Optional future trace layers

DAY MODAL
  Day number
  Date
  Title
  Location label
  Description
  Category filter buttons
  Thumbnail grid

LIGHTBOX
  Full-size image
  Previous button
  Next button
  Close button
  Keyboard controls

FOOTER
  Map attribution
  GitHub link
  Short credit
```

---

## 8. Data Flow

```text
data.js
  |
  |-- provides trip title and subtitle
  |-- provides categories
  |-- provides day entries
  |-- provides coordinates and route order
  |
  |-- Leaflet renders markers
  |
  |-- marker click opens modal
        |
        |-- fetch photos/<day-id>/manifest.json
        |-- render day text from data.js
        |-- render filter buttons
        |-- render thumbnails for selected filter
        |
        |-- thumbnail click opens lightbox
              |
              |-- lightbox navigates through currently visible photo set
```

Runtime network calls are limited to:

- OpenStreetMap tiles
- Local `route.geojson`
- Local `manifest.json` files
- Local image files

---

## 9. Main Data Model

### `data.js`

`data.js` is the single source of truth for trip metadata and daily entries.

```js
const TRIP = {
  title: "Turkey Loop",
  subtitle: "A day-by-day travel journal through Turkey, April 2026",

  categories: [
    {
      id: "places",
      label: "Places"
    },
    {
      id: "people",
      label: "People"
    },
    {
      id: "cats",
      label: "Cats"
    }
  ],

  days: [
    {
      id: "day-00-istanbul-arrival",
      day: 0,
      date: "2026-04-10",
      title: "Istanbul Arrival",
      locationLabel: "Istanbul",
      coords: [41.0082, 28.9784],
      routeOrder: 0,
      markerType: "city",
      description: "Arrival in Istanbul and the first impressions of the city.",
      coverCategory: "places",
      coverPhoto: "001.jpg"
    },
    {
      id: "day-01-istanbul-topkapi-palace",
      day: 1,
      date: "2026-04-11",
      title: "Topkapı Palace",
      locationLabel: "Topkapı Palace, Istanbul",
      coords: [41.0115, 28.9833],
      routeOrder: 1,
      markerType: "site",
      description: "A slow day through Ottoman imperial spaces, palace courtyards, museum rooms, and views over the Bosphorus.",
      coverCategory: "places",
      coverPhoto: "001.jpg"
    },
    {
      id: "day-06-gallipoli",
      day: 6,
      date: "2026-04-16",
      title: "Gallipoli",
      locationLabel: "Gallipoli Peninsula",
      coords: [40.2399, 26.2892],
      routeOrder: 6,
      markerType: "site",
      description: "A day shaped by memory, landscape, and the layered history of the Gallipoli campaign.",
      coverCategory: "places",
      coverPhoto: "001.jpg"
    }
  ]
};
```

### Field definitions

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | string | yes | Unique day slug. Must match the folder name under `/photos/`. |
| `day` | number | yes | Day number displayed to the visitor. |
| `date` | string | yes | ISO date, `YYYY-MM-DD`. |
| `title` | string | yes | Main title shown in marker popup and modal. |
| `locationLabel` | string | yes | Human-readable location label. |
| `coords` | array | yes | Leaflet coordinates in `[lat, lng]` order. |
| `routeOrder` | number | yes | Order used to draw the route and sort the day list. |
| `markerType` | string | optional | Suggested values: `city`, `site`, `walk`, `ferry`, `nature`. |
| `description` | string | yes | Short text shown in the day modal. |
| `coverCategory` | string | optional | Category used for cover image. |
| `coverPhoto` | string | optional | File name of the cover image inside the cover category folder. |

---

## 10. Photo Manifest Format

Each day folder has one manifest file:

```text
photos/day-01-istanbul-topkapi-palace/manifest.json
```

Recommended format:

```json
{
  "people": ["001.jpg", "002.jpg"],
  "places": ["001.jpg", "002.jpg", "003.jpg"],
  "cats": ["001.jpg"]
}
```

The frontend should derive All dynamically by concatenating the categories in a stable order:

```text
places, people, cats
```

This means the manifest does not need an explicit `all` key.

### Image path construction

For a day with id `day-01-istanbul-topkapi-palace`, category `places`, and file `001.jpg`, the frontend path is:

```text
photos/day-01-istanbul-topkapi-palace/places/001.jpg
```

For category `cats` and file `003.jpg`, the path is:

```text
photos/day-01-istanbul-topkapi-palace/cats/003.jpg
```

---

## 11. Helper Scripts

### `scripts/generate-manifests.js`

Purpose:

- Scan every day folder under `/photos/`.
- Look inside the `people`, `places`, and `cats` subfolders.
- Detect image files.
- Sort images alphabetically.
- Write one `manifest.json` file per day folder.

Supported image extensions:

- `.jpg`
- `.jpeg`
- `.png`
- `.webp`

Expected output example:

```json
{
  "people": ["001.jpg", "002.jpg"],
  "places": ["001.jpg", "002.jpg", "003.jpg"],
  "cats": []
}
```

The script should create empty arrays for missing or empty categories.

Console output should include:

- Number of day folders scanned.
- Number of photos found per day.
- Number of photos per category.
- Warnings for missing category folders.

### `scripts/generate-route.js`

Purpose:

- Read `data.js`.
- Extract all day entries with valid coordinates.
- Sort by `routeOrder`.
- Build a route through those coordinates.
- Call the OSRM public API locally.
- Save the result as `route.geojson`.

Important:

- This script is run locally only.
- The deployed website must not call OSRM at runtime.
- If OSRM fails, the script should fail gracefully and explain the error.
- If needed, a simple straight-line fallback route may be generated for development.

### `scripts/validate-data.js`

Purpose:

- Validate that each day has a unique id.
- Validate that each day folder exists.
- Validate that each day folder has `people`, `places`, and `cats` subfolders.
- Validate coordinate format.
- Validate date format.
- Validate that `coverCategory` exists.
- Validate that `coverPhoto` exists if defined.
- Validate that `routeOrder` values are unique.

This is not strictly required for v1, but it is useful because the project depends heavily on folder names matching `data.js` ids.

---

## 12. Frontend Behavior

### Map initialization

- Initialize Leaflet centered on Turkey.
- Load OpenStreetMap tiles.
- Load `route.geojson` and draw it as a styled line.
- Read `TRIP.days` from `data.js`.
- Add one marker per day.
- Sort days by `routeOrder`.

### Marker behavior

Each marker should show at least:

```text
Day 1
Topkapı Palace
Places 25 | People 9 | Cats 8
```

Photo counts require fetching the day manifest. For v1, this can happen lazily when the modal opens. If counts in marker popups are needed immediately, the frontend can fetch all manifests after map load, but this is optional.

### Modal behavior

When the user clicks a marker:

1. Open modal.
2. Load day metadata from `data.js`.
3. Fetch `photos/<day-id>/manifest.json`.
4. Compute category counts.
5. Render filter buttons.
6. Render All by default.
7. Render thumbnail grid.

### Filter behavior

The modal should keep a current filter state:

```js
let currentFilter = "all";
```

When the user clicks a filter:

- Update active button style.
- Rebuild the thumbnail grid.
- Update the current lightbox photo set.

The All filter should concatenate:

```text
places + people + cats
```

The order should be stable, so the gallery does not feel random.

### Lightbox behavior

The lightbox should navigate through the currently filtered photo set.

Example:

- If the modal is filtered to Cats, the lightbox navigates only through cat photos.
- If the modal is filtered to All, the lightbox navigates through all photos for that day.

Keyboard support:

| Key | Action |
|---|---|
| Escape | Close lightbox or modal |
| ArrowLeft | Previous photo |
| ArrowRight | Next photo |

---

## 13. Recommended UI Design

### Visual style

The website should feel like a curated travel atlas rather than a generic image dump.

Suggested tone:

- Warm
- Historical
- Slightly archival
- Clean and modern
- Not overly colorful
- Not tourist-brochure flashy

### Map-first layout

The map remains the central visual object.

The modal should be elegant and readable, with:

- Large day title
- Small date and location line
- Short text paragraph
- Filter buttons
- Responsive image grid

### Day modal layout

```text
------------------------------------------------
Day 1
Topkapı Palace
11 April 2026 | Istanbul

Short description paragraph.

[All 42] [Places 25] [People 9] [Cats 8]

[photo] [photo] [photo]
[photo] [photo] [photo]
------------------------------------------------
```

### Mobile behavior

On mobile:

- Header and footer should be compact.
- Modal should take most of the screen width.
- Thumbnail grid should use 2 columns.
- Filter buttons should wrap cleanly.
- Lightbox controls should be large enough to tap.

---

## 14. Suggested Initial Day List

This list should be refined by the project owner before implementation. It is a placeholder structure based on the trip concept and known examples.

```js
const INITIAL_DAYS = [
  "day-00-istanbul-arrival",
  "day-01-istanbul-topkapi-palace",
  "day-02-istanbul-archaeology-and-sultanahmet",
  "day-03-istanbul-hagia-sophia",
  "day-04-drive-to-gallipoli",
  "day-05-gallipoli",
  "day-06-troy-and-ayvalik",
  "day-07-ephesus-and-selcuk",
  "day-08-pamukkale-and-hierapolis",
  "day-09-mediterranean-coast",
  "day-10-kas-and-sunken-city",
  "day-11-konya",
  "day-12-cappadocia-arrival",
  "day-13-cappadocia-balloon-and-valleys",
  "day-14-eskisehir",
  "day-15-istanbul-return",
  "day-16-istanbul-theodosian-walls",
  "day-17-princes-islands-or-kadikoy"
];
```

The final day list should reflect the actual trip dates and photo folders.

---

## 15. Route and Pin Strategy

### Pins

Use one coordinate per day.

Good pin choices:

- Main historical site visited that day.
- Main town center for arrival or transit days.
- Main landscape feature for nature days.
- Start point or midpoint for meaningful walking days.

Avoid using:

- Hotel coordinates.
- Exact accommodation locations.
- Random transit points.
- Restaurant locations unless central to the story.
- Complete raw location history.

### Route line

The main `route.geojson` should connect major route points in travel order. It does not need to include every local walk.

For example:

```text
Istanbul -> Gallipoli -> Troy -> Ayvalik -> Selcuk -> Pamukkale -> Kas -> Konya -> Cappadocia -> Eskisehir -> Istanbul
```

### Optional special traces for later

Only add a trace if the movement itself is meaningful.

Examples:

- Theodosian Walls walk
- Princes Islands ferry and walk
- Cappadocia valley hike
- A meaningful coastal walk

---

## 16. Implementation Plan

### Phase 1 - Repository bootstrap

- Initialize Git repository.
- Create folder structure.
- Create placeholder `.gitkeep` files.
- Create `README.md`.
- Create `CONTENT_GUIDE.md`.
- Create `DEPLOYMENT.md` placeholder.
- Create `.gitignore`.
- Create initial `package.json` with scripts.

### Phase 2 - Data layer

- Create `data.js` with `TRIP` object.
- Use day-based entries, not destination-based entries.
- Include category definitions.
- Include placeholder day entries.
- Include coordinates in Leaflet format `[lat, lng]`.
- Include route order values.
- Create empty valid `route.geojson` placeholder.

### Phase 3 - Photo folder and manifest system

- Create example day folders.
- Create `people`, `places`, and `cats` subfolders for each example day.
- Write `generate-manifests.js`.
- Test manifest generation.
- Confirm each manifest has category keys.

### Phase 4 - Route generation

- Write `generate-route.js`.
- Read route points from `data.js`.
- Sort by `routeOrder`.
- Call OSRM locally.
- Save `route.geojson`.
- Add graceful error handling.

### Phase 5 - Frontend shell and layout

- Create `index.html`.
- Add header, main map container, footer.
- Add modal DOM.
- Add lightbox DOM.
- Create `style.css`.
- Ensure responsive layout.

### Phase 6 - Map layer

- Initialize Leaflet map.
- Load OpenStreetMap tiles.
- Load and draw `route.geojson`.
- Add markers from `TRIP.days`.
- Add click handlers to open day modal.

### Phase 7 - Gallery and category filters

- Fetch day manifest on marker click.
- Render day modal content.
- Render filter buttons with counts.
- Render All, Places, People, and Cats views.
- Rebuild thumbnail grid on filter change.

### Phase 8 - Lightbox

- Open full-screen image from thumbnail click.
- Navigate through current filtered set.
- Add previous and next buttons.
- Add keyboard support.
- Add close behavior.

### Phase 9 - Validation and content handoff

- Write or complete `validate-data.js`.
- Check that all day ids match folder names.
- Check category folders exist.
- Check manifests generate correctly.
- Check route draws.
- Check modals and filters.
- Check mobile behavior.
- Document content workflow in `CONTENT_GUIDE.md`.

### Phase 10 - GitHub Pages deployment

- Create `.github/workflows/deploy.yml`.
- Deploy static site to GitHub Pages.
- Confirm live URL.
- Update `DEPLOYMENT.md`.

---

## 17. Testing Checklist

### Data checks

- All day ids are unique.
- All day ids have matching photo folders.
- Every day folder has `people`, `places`, and `cats` subfolders.
- Every day has valid coordinates.
- Every day has a date.
- Every day has a title.
- `routeOrder` values are unique.
- Manifest files are valid JSON.

### Map checks

- Map loads and centers on Turkey.
- OpenStreetMap tiles load.
- Route line displays correctly.
- Markers appear at expected locations.
- Marker click opens the correct day.
- Route order matches trip order.

### Gallery checks

- Modal opens and closes.
- Description appears correctly.
- All filter displays all images.
- Places filter displays only places.
- People filter displays only people.
- Cats filter displays only cats.
- Empty categories display a friendly empty state.
- Counts match the manifest.

### Lightbox checks

- Thumbnail opens full-size image.
- Previous and next buttons work.
- Keyboard arrows work.
- Escape key closes lightbox.
- Lightbox respects current filter.
- Mobile tap targets are usable.

### Deployment checks

- GitHub Pages build completes.
- Site loads from public URL.
- Images load with correct relative paths.
- `route.geojson` loads from the deployed site.
- Manifests load from the deployed site.
- No console errors on first load.

---

## 18. Project Owner Manual Actions

| When | Action |
|---|---|
| Before data finalization | Confirm final day list and travel order. |
| Before route generation | Choose one public pin coordinate per day. |
| Before photo import | Create or confirm folder slugs. |
| Content phase | Paste photos into `people`, `places`, and `cats` folders. |
| Content phase | Write or dictate short descriptions for each day. |
| Content phase | Optionally choose cover photos. |
| Before deployment | Review that no private GPS traces or hotel locations are exposed. |

---

## 19. Content Workflow

### Adding a new day

1. Add a day entry to `data.js`.
2. Create a matching folder in `/photos/`.
3. Create three subfolders:
   - `people`
   - `places`
   - `cats`
4. Add photos to the appropriate category folders.
5. Run:

```bash
npm run generate-manifests
```

6. If the day changes the route, run:

```bash
npm run generate-route
```

7. Test locally.
8. Commit and push.

### Recommended photo naming

Use simple sequential names:

```text
001.jpg
002.jpg
003.jpg
```

This keeps gallery order predictable.

### Recommended image sizes

For v1, use exported web copies rather than huge originals.

Suggested maximum:

```text
2000 px on the longest edge
```

This keeps GitHub Pages loading manageable while preserving enough quality for a full-screen lightbox.

---

## 20. Suggested `package.json` Scripts

```json
{
  "scripts": {
    "generate-manifests": "node scripts/generate-manifests.js",
    "generate-route": "node scripts/generate-route.js",
    "validate-data": "node scripts/validate-data.js",
    "prepare-content": "npm run generate-manifests && npm run validate-data"
  }
}
```

Node 18 or later is recommended because it includes built-in `fetch`.

---

## 21. Coding Agent Instructions

The coding agent should implement the project phase by phase.

Important instructions:

- Do not implement a destination-based structure.
- Use `TRIP.days`, not `TRIP.destinations`.
- Use one day folder per day.
- Use `people`, `places`, and `cats` as required photo categories.
- Use one `manifest.json` per day.
- The All filter must be computed in the frontend.
- Keep the site static.
- Do not add a backend.
- Do not add a build system unless explicitly requested later.
- Do not publish raw Google Maps history.
- Keep the route curated and public-facing.
- Avoid exposing exact hotel or private location data.

---

## 22. Suggested Kickoff Prompt for Coding Agent

```text
You are implementing the Turkey Loop day-based travel photography website. The project specification is in this briefing document. Implement Phase 1 first: bootstrap the repository structure for a static GitHub Pages site using vanilla HTML, CSS, JavaScript, Leaflet.js, day-based photo folders, and People, Places, Cats photo categories. Do not implement a destination-based structure. Create the folder structure, README.md, CONTENT_GUIDE.md, DEPLOYMENT.md placeholder, .gitignore, package.json, and placeholder files. Confirm completion before moving to Phase 2.
```

---

## 23. Final Design Decision

The website should be a day-based travel diary map.

The primary unit is not a city or broad destination. The primary unit is a travel day.

The final public experience should be:

```text
Map of Turkey
  -> click Day 1: Topkapı Palace
      -> read short daily note
      -> view All, Places, People, Cats
      -> open photos in lightbox

  -> click Day 6: Gallipoli
      -> read short daily note
      -> view All, Places, People, Cats
      -> open photos in lightbox
```

This design better matches the real structure of the photo archive, keeps Istanbul from becoming an overloaded single gallery, and gives the trip a stronger narrative rhythm.
