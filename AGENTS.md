# AGENTS.md

## State of the repo

- HexBound is a witchcraft tower defense game. Only scaffolding exists (README, CI workflow); there is **no application code or package.json yet**. Early sessions are bootstrapping the project, not modifying one.
- `opencode.json` is local OpenCode config (permission rules), not app config.

## Build contract (from `.github/workflows/deploy.yml`)

When creating the project, it must satisfy what CI runs — an agent would otherwise guess wrong:

- Node 22, npm-managed (`npm ci` in CI, so a lockfile is required).
- `package.json` needs `lint`, `test`, and `build` scripts.
- Build output must land in `dist/` — that exact path is uploaded as the site artifact.

## Deploy behavior

- Every push to `main` runs lint → test → build, then deploys `dist/` to GitHub Pages. A red build means the live site doesn't update; verify lint/test/build locally before committing to main.
- Newer pushes cancel in-progress deploys (concurrency group `pages`); only the latest commit ships.
