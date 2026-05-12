# Content Guide

This project uses a day-based workflow for turning selected travel photos into a publishable static website.

## Required Photo Source Structure

The WebP generation pipeline expects this local folder structure:

```text
pictures/4_days_HR/
  main_site/
  <day-slug>/
    people/
    places/
    animals/
```

The `pictures/4_days_HR/` folder must exist locally for `npm run prepare-content` to work. Each `<day-slug>` must match a `slug` in `assets/js/data.js`.

Use these category folders:

- `people`
- `places`
- `animals`

The internal category name is `animals`; the website displays it as `Animals`.

## Main Site Images

The pipeline also expects these files:

```text
pictures/4_days_HR/main_site/header.jpg
pictures/4_days_HR/main_site/about_me.jpeg
pictures/4_days_HR/main_site/intrepid_route.webp
```

They are generated into `public/photos/main_site/` and used by the header/about/route panels.

## Photo Generation

After adding or replacing high-resolution photos, run:

```bash
npm run prepare-content
```

This command:

- validates `assets/js/data.js`,
- generates optimized WebP full-size and thumbnail images,
- writes day manifests under `public/photos/<day-slug>/manifest.json`,
- writes `public/data/photo-manifest.json`,
- validates that public photos and manifests match.

Only optimized web photos belong in `public/photos/`. Do not place private, full-resolution, or unselected working photos there.

## Day Content

Edit `assets/js/data.js` for day titles, dates, coordinates, summaries, descriptions, expanded descriptions, and categories. Every intended map marker needs valid latitude/longitude coordinates.

Run these checks after changing content:

```bash
npm run data:validate
npm run photos:validate
npm run site:smoke
```
