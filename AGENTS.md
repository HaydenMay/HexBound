# AGENTS.md

HexBound: witchcraft tower defense. Godot 4.6.1 (GDScript, gl_compatibility renderer) web game; GUT unit tests. Playable; deploys to GitHub Pages on every push to `main`. The original TypeScript/Three.js stack is archived under `legacy-ts/` (kept for data generation + parity reference; not built, tested, or deployed).

## Commands

Engine console exe: `C:\Users\mayha\Documents\Godot\Godot_v4.6.1-stable_win64_console.exe` — call it with `& "..."` in PowerShell. Shorthand below as `godot`.

- GUT suite: `godot --headless --path godot -s addons/gut/gut_cmdln.gd` (74 tests / ~1970 asserts; `.gutconfig.json` exits when done)
- Single suite: append `-gselect=test_hud` (or `-gtest=res://tests/unit/test_hud.gd`)
- Import pass (needed after adding scripts/new `class_name`s): `godot --headless --path godot --import`
- Web export: create `dist-godot/` first, then `godot --headless --path godot --export-release "Web" "../dist-godot/index.html"`
- Web smoke gate: `node wasm-smoke.mjs` — serves `dist-godot/` under `/HexBound/`, asserts wasm+pck load with zero page errors, dumps `screenshots/wasm-boot.png`
- Battle screenshots: `godot --path godot --resolution 1280x800 -- --shot=desktop` (or `--resolution 412x915 -- --shot=mobile`) → `screenshots/godot-battle-*.png` (auto-places the 9-tower showcase, starts wave 1, shoots at t+5s)

## Gotchas

- **New `class_name` scripts are invisible until an import pass.** After adding/renaming scripts, run `--import` or the next boot fails with "Identifier not declared in current scope".
- **GUT is excluded from exports** (`export_presets.cfg` `exclude_filter="addons/gut/*,tests/*"`) — its scripts break the binary-token export. Keep it excluded.
- **The export target folder must exist** before `--export-release`, or the export fails with "Target folder does not exist".
- **Everything is served under `/HexBound/`** on Pages. Godot web builds use relative paths, so no base-path config is needed; `wasm-smoke.mjs` mimics the subpath locally.
- **CI runs import → GUT gate → web export** (`.github/workflows/deploy.yml`). There is no typecheck step; GDScript parse errors surface at import/boot, so the GUT suite + a local export + `node wasm-smoke.mjs` are your pre-push gates.
- **Host is Windows/PowerShell.** Quote the engine path, call with `&`, env vars via `$env:X='1'`.
- **Data tables are generated.** `godot/scripts/data/*_data.gd` comes from `legacy-ts/src/data` via `legacy-ts/tools/export-data.mjs` (run node inside `legacy-ts/`). Never hand-edit; after regenerating, GUT parity suite + vitest must both stay green.

## Layout

- `godot/` — the shipped game. `scripts/sim/` pure game logic (no rendering imports; GUT-tested), `scripts/render/`, `scripts/ui/`, `scripts/input_controller.gd`, `scripts/data/` generated tables, `tests/unit/` GUT suites, `addons/gut/` vendored GUT 9.6.1, `export_presets.cfg` Web preset, `scenes/main.tscn` boots `scripts/game_controller.gd`.
- `legacy-ts/` — archived TypeScript + Three.js + Vite stack (vitest, Playwright e2e). Historical parity reference and the source for data-table generation. Not deployed; its `npm test` still works from inside that folder.
- `wasm-smoke.mjs` — local gate for the exported web build.
- `docs/screenshots/` — baseline TS shots + current Godot shots (`godot-battle-*.png`).
- Docs map: `design.md` = source of truth for required gameplay; `TOWERS.md` = tower/synergy/foe reference; `VISUAL_NOTES.md` = visual rationale. Update them when behavior or content changes. `HANDOFF.md`, when present, describes in-progress work — read it first.

## Long-running tasks

- Track multi-step work in a todo list. **Never end your turn while a todo item is still pending** — stopping "at a natural checkpoint" is a failure, not a pause.
- If interrupted mid-task, read the todo state and resume from the first pending item.
- Commit after each piece passes its checks so interruptions lose almost nothing.
- The only acceptable stop is: every check green (GUT suite, local export + `node wasm-smoke.mjs`) and everything committed. Never stop at a round count or because the user hasn't messaged recently.

## Deploy

Push to `main` → Pages workflow caches Godot 4.6.1 + templates, runs import → GUT gate → `--export-release "Web"` → ships `dist-godot/`. Newer pushes cancel in-flight deploys (concurrency group `pages`); only latest commit goes live. Verify GUT + a local export + wasm-smoke before pushing — a red gate blocks the live site update.
