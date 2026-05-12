# Deployment

This site deploys to GitHub Pages from the repository root using GitHub Actions. The workflow publishes the committed static files and does not run photo generation.

## Enable GitHub Pages

The project owner must enable GitHub Pages from Actions once in the repository settings:

```text
Repository -> Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

After this setting is enabled, pushes to `main` can publish the static site through `.github/workflows/deploy.yml`.

## Local Checks Before Pushing

Run:

```bash
npm run data:validate
npm run photos:validate
npm run site:smoke
```

For a browser preview, run:

```bash
npm run serve
```

Then open:

```text
http://127.0.0.1:4173/
```

## Manual Push And Publish

1. Review the local diff.
2. Commit the changes.
3. Push to `main` manually.
4. Open the repository's Actions tab.
5. Wait for `Deploy static site to GitHub Pages` to finish successfully.

The workflow can also be started manually from the Actions tab by selecting `Deploy static site to GitHub Pages` and using `Run workflow`.

## Live URL

The expected GitHub Pages URL is:

```text
https://Fernando3161.github.io/turkey_vacation/
```

The confirmed live URL is also available in:

- `Settings -> Pages`
- the completed GitHub Actions deployment summary

## If The Site Does Not Update

Check these items first:

- Confirm the latest workflow run completed successfully.
- Confirm `Settings -> Pages -> Build and deployment -> Source` is set to `GitHub Actions`.
- Confirm the latest commit was pushed to `main`.
- Open the failed workflow run and check whether artifact upload or Pages deployment failed.
- Hard refresh the browser or clear the browser cache.
- Wait a few minutes for GitHub Pages propagation, then reload the live URL.
