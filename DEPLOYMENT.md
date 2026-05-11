# Deployment

This site deploys to GitHub Pages from the repository root using GitHub Actions. No build step is required, and the deployment workflow does not run photo generation.

## Enable GitHub Pages

The project owner must enable GitHub Pages from Actions once in the repository settings:

```text
Repository -> Settings -> Pages -> Build and deployment -> Source -> GitHub Actions
```

After this setting is enabled, pushes to `main` can publish the static site through `.github/workflows/deploy.yml`.

## Push Updates

1. Make and review the site changes locally.
2. Commit the changes.
3. Push to `main`.
4. Open the repository's Actions tab and wait for `Deploy static site to GitHub Pages` to finish.

The workflow can also be started manually from the Actions tab by selecting `Deploy static site to GitHub Pages` and using `Run workflow`.

## Find the Live URL

The live URL is available in either of these places:

- Repository settings under `Settings -> Pages`.
- The completed GitHub Actions deployment summary.

For this repository, the expected GitHub Pages URL is:

```text
https://Fernando3161.github.io/turkey_vacation/
```

## If the Site Does Not Update

Check these items first:

- Confirm the latest workflow run in the Actions tab completed successfully.
- Confirm `Settings -> Pages -> Build and deployment -> Source` is set to `GitHub Actions`.
- Confirm the changes were pushed to `main`.
- Open the failed workflow run and check whether artifact upload or Pages deployment failed.
- Hard refresh the browser or clear the browser cache.
- Wait a few minutes for GitHub Pages propagation, then reload the live URL.
