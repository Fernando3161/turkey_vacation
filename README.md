# Turkey Loop Travel Photography

This repository contains a static, day-based travel photography website for a Turkey loop trip. The published site is built from plain HTML, CSS, browser JavaScript, optimized WebP photos, and JSON photo manifests.

## Project Contents

- `index.html` - the static page shell.
- `assets/css/styles.css` - all site styling.
- `assets/js/` - day data, map markers, modals, gallery filters, lightbox behavior, and page initialization.
- `public/photos/` - optimized publishable WebP photos, organized by day, category, and size.
- `public/data/photo-manifest.json` - global photo manifest used by the gallery.
- `scripts/` - local validation, photo generation, manifest generation, smoke testing, and static serving tools.
- `pictures/4_days_HR/` - local high-resolution source photo structure required by the WebP generation pipeline. This folder is intentionally ignored by Git.
- `.github/workflows/deploy.yml` - GitHub Pages deployment workflow.
- `CONTENT_GUIDE.md` and `DEPLOYMENT.md` - operational documentation for content updates and publishing.

## Development History

The project started as a repository scaffold for a day-based Turkey travel memoir and photo gallery. Later phases added the static website, map markers, day modals, category-based galleries, lightbox browsing, optimized public photos, generated manifests, validation scripts, smoke tests, and GitHub Pages deployment.

The final content handoff uses the real day list, real coordinates, real descriptions, and optimized photos generated from the local high-resolution source folders. Route rendering, OSRM, `route.geojson`, and travel path drawing are intentionally not part of this project.

## How To Update The Photo Gallery

The WebP generation pipeline requires this source folder structure to exist locally:

```text
pictures/4_days_HR/
  main_site/
  <day-slug>/
    people/
    places/
    animals/
```

Each `<day-slug>` must match a `slug` in `assets/js/data.js`. Put high-resolution source photos into the matching category folder:

- `people` for group or portrait photos.
- `places` for locations, buildings, landscapes, objects, food, and general travel context.
- `animals` for animal photos.

The `main_site` folder is used for the required site images:

```text
pictures/4_days_HR/main_site/header.jpg
pictures/4_days_HR/main_site/about_me.jpeg
pictures/4_days_HR/main_site/intrepid_route.webp
```

After changing source photos, run:

```bash
npm run prepare-content
```

That command validates `assets/js/data.js`, generates optimized WebP files in `public/photos/`, writes day manifests, writes `public/data/photo-manifest.json`, and validates that every manifest entry has matching full and thumbnail images.

Before committing gallery updates, run:

```bash
npm run data:validate
npm run photos:validate
npm run site:smoke
```

Commit the generated `public/photos/` files and manifests. Do not commit full-resolution source photos from `pictures/4_days_HR/`.

## How To Update Day Content

Edit `assets/js/data.js` when changing the itinerary, descriptions, dates, locations, coordinates, or category list. Every day intended to appear on the map needs a valid `coordinates: [latitude, longitude]` entry.

After editing day content, run:

```bash
npm run data:validate
npm run site:smoke
```

If day slugs changed, update the matching folders under `pictures/4_days_HR/` before regenerating public photos.

## Local Preview

Run the static server:

```bash
npm run serve
```

Then open:

```text
http://127.0.0.1:4173/
```

## Deployment

This repository deploys from `main` through GitHub Pages Actions. The deployment workflow publishes the committed static files; it does not generate photos.

Publish flow:

1. Make content or documentation changes locally.
2. Run the validation and smoke-test commands.
3. Commit the changes.
4. Push to `main`.
5. Check the `Deploy static site to GitHub Pages` workflow in GitHub Actions.
