# Files Not Necessary For The Static Site Runtime

This memo lists files that are not required for the website to function in a browser after the static files have been published. It excludes all files under `pictures/`.

Keep any file that is still useful for development, validation, future photo generation, documentation, or deployment.

## Documentation And Planning Files

- `CONTENT_GUIDE.md`
- `DEPLOYMENT.md`
- `README.md`
- `docs/memoir/coordinates_raw.csv`
- `docs/memoir/coordinates_raw.xlsx`
- `docs/memoir/chats/`

## Local Photo Preparation And Categorization Helpers

- `requirements.txt`
- `models/blaze_face_short_range.tflite`
- `yolov8n.pt`
- `media_file_list.txt`
- `scripts/categorize_pictures.py`
- `scripts/generate_web_photos.py`
- `scripts/setup_and_generate_photos.sh`
- `scripts/setup_and_run_categorization.bat`
- `scripts/update_public_photos.bat`

## Local Validation, Generation, And Preview Tooling

- `package.json`
- `package-lock.json`
- `scripts/generate-lr-photos.js`
- `scripts/generate-manifests.js`
- `scripts/serve-static.js`
- `scripts/smoke-test-website.js`
- `scripts/validate-data.js`
- `scripts/validate-photo-assets.js`

## Repository And Deployment Support

- `.github/workflows/deploy.yml`
- `.github/workflows/.gitkeep`
- `.gitignore`
- `.nojekyll`
- `.venv/`
- `node_modules/`

## Runtime Files To Keep For The Site

These files are required for the published static site itself:

- `index.html`
- `assets/css/styles.css`
- `assets/js/`
- `public/data/photo-manifest.json`
- `public/photos/`
