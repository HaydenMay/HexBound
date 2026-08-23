# HANDOFF — Godot visual port next: items 17–22 (MCP era)

**State:** TS game shipped & live on Pages. P2a/P2b complete (`b821e91`, all gates green). Pre-MCP Godot phase COMPLETE:

- ✅ **12 Tooling** — console exe verified (`4.6.1.stable.official`), export templates installed; `opencode.json` GODOT_PATH set (MCP loads after OpenCode restart)
- ✅ **13 iPhone spike — PASSED on-device**: instant load, clean render, working touch. Delivered over real HTTPS via GitHub Pages (`/spike/`, since purged), not LAN
- ✅ **14 Bootstrap** — `godot/` project, gl_compatibility renderer, scenes/scripts/tests layout, vendored GUT 9.6.1, headless smoke green (`cb1a0bb`)
- ✅ **15 Data tables** — GENERATED from TS sources by `tools/export-data.mjs` → `godot/scripts/data/*_data.gd` + fixture `godot/tests/fixtures/data.json`; parity suite covers every value incl. applySize ×15 (`de7fc31`)
- ✅ **16 Sim core** — hex/grid/flowfield/emitter/enemy/ally/structure ops/game loop ported; **GUT 56/56 green headless (1905 asserts) · vitest 53/53 green** (`a4aea62`)

Critic round (fresh-context judge ran both suites) passed after fixes in `d821172`: stable-order tie-breaks for spawn + totem sorts (wave 4 has an exact t=8 tie), TS-falsy semantics for spreadRadius/frenzyPerSec, JS Math.round parity in cube rounding.

**→ Restart OpenCode so the godot MCP loads, then resume at item 17 (renderer rebuild).**

## Locked decisions

GDScript (not C# — no web export) · single-threaded Web export · side-by-side under `godot/` while TS stays live on Pages · parity before visuals · engine console exe at `C:\Users\mayha\Documents\Godot\`.

## Remaining — Godot migration items 17–22

17. **Renderer rebuild** — hex field mesh, procedural MeshInstance3D towers (all 9 kinds incl. watching eye), two-tone warm-key + moon-fill lighting, violet fog, quiet path-flow arrows, red capsules w/ poison tint, resident witches w/ idle animation, aspect-aware camera + battle blend (per VISUAL_NOTES.md). References: `src/render/renderer.ts`. Keep gl_compatibility.
18. **Input & camera** — raycast pick/place/tap/select, pan/pinch zoom, two-tap confirm on touch, Escape/right-click cancel — UX parity with TS version.
19. **HUD Control nodes** — palette (9 cards), topbar ritual/stability, wave/speed/pause, structure + enemy inspect panels (scout-gated weakness row), boss-intro banner, breach vignette + audio hook.
20. **Saves & menu** — `user://` JSON saves compatible with current schema, level select with locks, campaign map-size picker.
21. **Parity sweep** — design.md walked § by § against the running game; screenshots (desktop 1280x800 + mobile portrait) judged side-by-side against `docs/screenshots/` baseline; fix every gap named.
22. **Flip CI/deploy** — Actions: `godot --headless` import + GUT gate + `--export-release "Web"` → Pages artifact under `/HexBound/`; verify live URL on iPhone once; TS stack archived to `legacy-ts`; rewrite AGENTS.md commands/layout/gotchas for Godot; update README/TOWERS/VISUAL_NOTES pointers.

### Migration definition of done

iPhone spike passed · GUT suites green headless · parity sweep clean vs design.md and screenshot baseline · Pages serves the Godot build · TS archived to `legacy-ts` · AGENTS/docs updated · everything committed and pushed.

## Design law (do not violate — enforced by tests on both stacks)

No enemy ever erases applied debuffs; paladin cleanses nearby allies but **never itself**; silence disables only {cauldron, totem, idol, ring, well} — **Mirror exempt**; poison already ticking continues while its cauldron is silenced; sell only in `phase == building`.

## History

- `53542d6` gauntlet-loop run-to-completion contract + AGENTS.md long-running rules
- `5f5e4e3` P1 interactions: sell/dismantle + refund preview, two-tap confirm, battle camera blend
- Old plan items 1–11 (P2a/P2b: foe weave, eye mesh + inspect UI, boss intros, sell lock, m4 tests, e2e counts 9, docs) — SHIPPED `b821e91`
