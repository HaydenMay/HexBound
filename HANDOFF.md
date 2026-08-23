# HANDOFF — Godot visual port next: items 17–22 (MCP era)

**State:** TS game shipped & live on Pages. P2a/P2b complete (`b821e91`, all gates green). Pre-MCP Godot phase COMPLETE:

- ✅ **12 Tooling** — console exe verified (`4.6.1.stable.official`), export templates installed; `opencode.json` GODOT_PATH set (MCP loads after OpenCode restart)
- ✅ **13 iPhone spike — PASSED on-device**: instant load, clean render, working touch. Delivered over real HTTPS via GitHub Pages (`/spike/`, since purged), not LAN
- ✅ **14 Bootstrap** — `godot/` project, gl_compatibility renderer, scenes/scripts/tests layout, vendored GUT 9.6.1, headless smoke green (`cb1a0bb`)
- ✅ **15 Data tables** — GENERATED from TS sources by `tools/export-data.mjs` → `godot/scripts/data/*_data.gd` + fixture `godot/tests/fixtures/data.json`; parity suite covers every value incl. applySize ×15 (`de7fc31`)
- ✅ **16 Sim core** — hex/grid/flowfield/emitter/enemy/ally/structure ops/game loop ported; **GUT 56/56 green headless (1905 asserts) · vitest 53/53 green** (`a4aea62`)
- ✅ **17 Renderer** — p1 battle view (`7c1e4f7`): hex diorama field, spire ridge, two-tone lights + violet fog, procedural meshes for all 9 towers w/ idle residents, poison-tinted enemy capsules, ritual pulse + breach flash. p2 (`a0fccae`): multimesh path-flow arrows, TS-parity camera blend (building↔battle smoothstep, aspect-aware dist clamp 12–34), ambient fill + ground disc
- ✅ **18 Input & camera** (`2f50f96`) — raycast pick/tap/select, mouse drag + WASD pan, wheel/pinch zoom, touch two-tap confirm, right-click + Escape cancel, digit palette keys, P/Space; ghost placement preview w/ valid/invalid tint + selection ring; **GUT 61/61 green**
- ✅ **19 HUD** (`90fec36`) — 9-card palette (affordability + selection), topbar essence/wave/ritual/stability, wave preview chips, start/pause/speed, structure inspect (upgrades/forks/sacrifice/dismantle w/ sell lock), scout-gated enemy inspect, boss intro, banners, breach vignette + procedural audio, end overlay
- ✅ **20 Saves & menu** (`5b23967`) — `user://` JSON save (schema v1, corrupt-safe, TS-compatible), field-size pref file, menu-first boot with level locks + size picker + reset, `FieldSize.apply` JS-rounding port, abandon-to-menu
- ✅ **21 Parity sweep** (`9bcf40f`) — design.md walked § by § (sim parity already test-backed); screenshot harness `--shot=desktop|mobile` mirrors the TS SHOTS composition; desktop 1280×800 + mobile 412×915 shots judged vs `docs/screenshots/` baseline; fixed: ridge side (was in front of field), TS-parity ritual pedestal/ring/orb (progress scale + bob), tile state tinting (structure/penalty/entrance) on fieldChanged, emissive grove briars, red pips, green essence, def-color bitshift, card height, narrow-viewport controls row. **GUT 74/74**

Critic round (fresh-context judge ran both suites) passed after fixes in `d821172`: stable-order tie-breaks for spawn + totem sorts (wave 4 has an exact t=8 tie), TS-falsy semantics for spreadRadius/frenzyPerSec, JS Math.round parity in cube rounding.

**→ Resume at item 22 (flip CI/deploy). Godot MCP verified loaded (4.6.1.stable responds).**

## Locked decisions

GDScript (not C# — no web export) · single-threaded Web export · side-by-side under `godot/` while TS stays live on Pages · parity before visuals · engine console exe at `C:\Users\mayha\Documents\Godot\`.

## Remaining — Godot migration item 22

22. **Flip CI/deploy** — Actions: `godot --headless` import + GUT gate + `--export-release "Web"` → Pages artifact under `/HexBound/`; verify live URL on iPhone once; TS stack archived to `legacy-ts`; rewrite AGENTS.md commands/layout/gotchas for Godot; update README/TOWERS/VISUAL_NOTES pointers.

### Migration definition of done

iPhone spike passed · GUT suites green headless · parity sweep clean vs design.md and screenshot baseline · Pages serves the Godot build · TS archived to `legacy-ts` · AGENTS/docs updated · everything committed and pushed.

## Design law (do not violate — enforced by tests on both stacks)

No enemy ever erases applied debuffs; paladin cleanses nearby allies but **never itself**; silence disables only {cauldron, totem, idol, ring, well} — **Mirror exempt**; poison already ticking continues while its cauldron is silenced; sell only in `phase == building`.

## History

- `53542d6` gauntlet-loop run-to-completion contract + AGENTS.md long-running rules
- `5f5e4e3` P1 interactions: sell/dismantle + refund preview, two-tap confirm, battle camera blend
- Old plan items 1–11 (P2a/P2b: foe weave, eye mesh + inspect UI, boss intros, sell lock, m4 tests, e2e counts 9, docs) — SHIPPED `b821e91`
