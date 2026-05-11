# Content Guide

This project uses a day-based workflow for turning travel photos into a publishable website.

## Photo Workflow

Keep original and high-resolution working photos in the local `pictures/` folders. These folders are for preparation and selection only, and they are ignored by Git because they can be large.

The local workflow folders are:

- `pictures/1_original_pictures/` for the untouched source photos.
- `pictures/2_selected_pictures/` for photos selected from the originals.
- `pictures/3_sorted_theme_pictures/` for selected photos grouped by theme.
- `pictures/4_days_HR/` for high-resolution photos sorted into travel days.

Only optimized web photos belong in `public/photos/`. This folder is not ignored because it contains the published image assets for GitHub Pages.

## Day Organization

Each travel day should have a clear day number and a readable slug, for example `day10_kas_coastal_town`. Within a day, photos can be grouped by simple themes such as `places`, `people`, or other useful categories.

Future site data should describe the days in plain language: where the day happened, what the main moments were, and which optimized photos should appear on the website.

## Editing Rule

Do not place private, full-resolution, or unselected working photos in `public/photos/`. Only add photos there after they have been selected, optimized, and are intended for publication.
