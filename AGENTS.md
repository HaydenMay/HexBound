# AGENTS.md

## State of the repo

- HexBound is a witchcraft tower defense game: TypeScript + Three.js + Vite, Vitest unit tests, Playwright e2e gate (desktop + mobile). The game is playable and deploys to GitHub Pages on every push to `main`.
- `opencode.json` is local OpenCode config (permission rules), not app config.
- `.claude/skills/` holds local skill definitions; `design.md` is the original build prompt and the source of truth for what the game must contain.

## Long-running tasks

- Track multi-step work in a todo list. **Never end your turn while a todo item is still pending** — stopping "at a natural checkpoint" is a failure, not a pause.
- If interrupted mid-task, read the todo state and resume from the first pending item.
- Commit after each piece passes its checks so interruptions lose almost nothing.
- The only acceptable stop is: every check green (`npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`) and everything committed. Never stop at a round count or because the user hasn't messaged recently.

## Build contract (from `.github/workflows/deploy.yml`)

- Node 22, npm-managed (`npm ci` in CI, so the lockfile must stay in sync with package.json).
- `package.json` needs `lint`, `test`, and `build` scripts; build output lands in `dist/`.

## Deploy behavior

- Every push to `main` runs lint → test → build, then deploys `dist/` to GitHub Pages. A red build means the live site doesn't update; verify lint/test/build locally before committing to main.
- Newer pushes cancel in-progress deploys (concurrency group `pages`); only the latest commit ships.
