# AGENTS.md

HexBound: witchcraft tower defense. TypeScript + Three.js + Vite, Vitest unit tests, Playwright e2e (desktop + mobile). Playable; deploys to GitHub Pages on every push to `main`.

## Commands

- Setup: `npm ci` (Node 22; lockfile must stay in sync with package.json — CI runs `npm ci`).
- `npm run dev` · `npm test` · `npm run lint` · `npm run test:e2e`
- `npm run build` = `tsc --noEmit && vite build` → `dist/`. This is the typecheck; there is no separate typecheck script.
- Single unit test: `npx vitest run src/sim/game.test.ts`. Single e2e: `npx playwright test e2e/desktop.spec.ts --project=desktop|mobile`.

## Gotchas

- **Build before e2e.** `test:e2e` starts `vite preview`, which serves the *existing* `dist/` as-is (and reuses whatever is already on :4173). A stale `dist/` means you tested old code. Run `npm run build` first.
- **Everything is served under `/HexBound/`** (vite `base`). Dev/preview URLs are `http://localhost:<port>/HexBound/`, not root.
- **CI runs only lint → test → build** (`.github/workflows/deploy.yml`). E2e never runs in CI; it is a local gate you must run yourself before pushing to `main`. Green CI ≠ working game.
- **Adding a structure breaks e2e:** desktop/mobile/palette.spec.ts hard-code palette size (`toHaveCount(8)`). New tower ⇒ bump those counts plus data/mesh/docs.
- **Host is Windows/PowerShell.** Env vars go `$env:SHOTS='1'; npx playwright test`, not `SHOTS=1 ...`. The screenshot harness (`SHOTS=1`, `e2e/screenshot.spec.ts`) writes to `screenshots/`.

## Layout

- `src/sim/` pure game logic (no Three.js imports; runs in node-env Vitest). `src/data/` content tables (levels/waves/structures/enemies). `src/render/renderer.ts` is the only file importing three — all art is procedural meshes via `makeStructureMesh`; no image files, ever (see assets policy in TOWERS.md).
- `src/main.ts` wires everything and exposes the game as `window.__hexboundGame`; e2e specs and the screenshot harness drive it directly.
- Docs map: `design.md` = source of truth for required gameplay; `TOWERS.md` = tower/synergy/foe reference; `VISUAL_NOTES.md` = visual rationale. Update them when behavior or content changes. `HANDOFF.md`, when present, describes in-progress work — read it first.
- `opencode.json` is OpenCode config (permissions/MCP), not app config. `.claude/skills/` holds local skills (notably `gauntlet-loop`).

## Long-running tasks

- Track multi-step work in a todo list. **Never end your turn while a todo item is still pending** — stopping "at a natural checkpoint" is a failure, not a pause.
- If interrupted mid-task, read the todo state and resume from the first pending item.
- Commit after each piece passes its checks so interruptions lose almost nothing.
- The only acceptable stop is: every check green (`npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`) and everything committed. Never stop at a round count or because the user hasn't messaged recently.

## Deploy

Push to `main` → Pages workflow runs lint → test → build, ships `dist/`. Newer pushes cancel in-flight deploys (concurrency group `pages`); only latest commit goes live. Verify all four gates locally before pushing — a red build blocks the live site update.
