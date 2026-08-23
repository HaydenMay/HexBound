# HANDOFF — Godot logic layer DONE; next: visual port items 17–22 (MCP era)

**Pre-MCP phase complete** — spike passed on iPhone (HTTPS via Pages), `godot/` bootstrapped (gl_compatibility), data tables generated from TS sources with fixture-backed parity tests, full sim core ported. **GUT 56/56 green headless · vitest 53/53 green.** Critic round passed after fixes: stable-order tie-breaks (spawn/totem sorts), TS-falsy spreadRadius/frenzy semantics, JS Math.round parity in cube rounding.

Restart OpenCode so the godot MCP loads, then resume at item 17 (renderer rebuild).

## Already committed on main (safe)

- `5f5e4e3` P1 interactions: sell/dismantle + refund preview, two-tap confirm on touch, battle camera blend, gem palette
- `53542d6` gauntlet-loop skill run-to-completion contract + AGENTS.md long-running rules

## Foundation commit (pushed to main; UI/renderer/e2e work below remains)

Sim/data foundation for P2a+P2b is complete and passing 46 unit tests + tsc build:

- `src/sim/types.ts` — `DamageType`, `EnemyDef.weakness/boss/intro/charmImmune/cleanse/silence/summon`, `EyeStats`, `KindStats 'eye'`
- `src/sim/enemy.ts` — cleanse/silence/summon clocks
- `src/sim/structures.ts` — `disabled` field, eye kind mapping
- `src/sim/game.ts` — `damageEnemy()` router (eye amp), `applyFoeAbilities()`, `applyEyes()`, disabled guards (cauldron grant / idol / totem / well sacrifice+essence / ring raise), charm-immune filter, sell locked to build phase, `scouted` set
- `src/data/enemies.ts` — paladin / inquisitor / grandinquisitor + weaknesses on all 9 types + intro copy
- `src/data/structures.ts` — watchingeye tower (3 tiers, amp 15/25/35%) + STRUCTURE_ORDER now has 9 entries

Design law (do not violate): no enemy ever erases applied debuffs; paladin cleanses nearby chaff but **never itself**; silence disables only {cauldron, totem, idol, ring, well} — **Mirror exempt**; poison already ticking continues while its cauldron is silenced; sell only in `phase === 'building'`.

## Remaining

1. **levels.ts waves** — weave foes: L3 w3 `paladin×2`, w5 `paladin×3`; L4 w4 `inquisitor×1`, w5 `inquisitor×2`; L5 w2 `paladin×2`, w4 `inquisitor×2`, w6 `grandinquisitor×1`, w8 `grandinquisitor×2`. Keep wave counts > 0; levels.test must stay green.
2. **renderer.ts** — (a) split `pickHex` into `pickWorld(clientX, clientY): Vector3 | null`; tap handler finds nearest enemy via `lerpHexToWorld(e.cur, e.next, e.t)` within ~0.9 world units (+0.15×def.scale); extend `onTap(hex, source, enemy | null)` and pass from releasePointer. (b) add `kind === 'eye'` case in `makeStructureMesh`: stone ring base + floating emissive octahedron iris (amber 0xd8a040), bob + slow spin via `addTick`.
3. **hud.ts** — (a) `showEnemy(e | null)` + per-frame refresh while selected (find by id in `game.enemies`; close when dead): name, live HP, trait tags (curseResist≥0.5 → "curse-proof"; charmImmune → "uncharmable"; silence → "silencer"; cleanse → "cleanser"; summon → "summoner"; structureDamage → "wallbreaker"), weakness row = revealed (`game.scouted.has(def.id)`) ? "Weak: Poison/Shock/Burst" : "Weakness: ??? — scout with the Watching Eye". (b) sell button disabled unless `game.phase === 'building'` (re-query each frame like upgrade buttons; desc becomes "The circle is sealed while foes march"). (c) `showIntro(title, lines)` driving `#bossintro`, auto-hide after ~5s.
4. **index.html** — `#enemy-inspect` panel markup + CSS (desktop left 16/top 72/width 240; mobile bottom above palette ~232px, full-width), tag chip styles, `#bossintro` animated slide-down banner styles under topbar.
5. **main.ts** — onTap third param: enemy → `hud.showEnemy(enemy)` + close structure inspect; empty ground closes both; Escape too. Intro listener inside startLevel: `seenIntro` Set; on `enemySpawned`, if def.intro && (def.boss || !seenIntro.has(id)) → showIntro + seenIntro.add.
6. **e2e counts 8→9** — desktop.spec `toHaveCount(8)` and palette.spec `toHaveCount(8)` + loop bound.
7. **m4.test.ts** — paladin cleanses poisoned ally but not itself; inquisitor silences totem then it recovers; grand inquisitor summons extend the wave; idol skips charmImmune target; sell blocked during active phase, allowed in building; eye amp applies in-radius only (knight takes ×1.15 shock at t1); scouting reveals per-type persistently.
8. **Gates** — `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`. Fix fallout (watch m3 hemorrhage/priest numbers now that poison routes through damageEnemy).
9. **Critic** — screenshot desktop+mobile (building + battle) via SHOTS=1 harness; blind-judge against design.md §14 (Eye informs), §19 (foes behave as specced), §32 (breach feedback incl. boss intro).
10. **Docs** — TOWERS.md foe roster (add Paladin/Elite Inquisitor/Grand Inquisitor + weaknesses line) + Watching Eye section; README one-liner about enemy inspection.
11. **Ship** — single commit (or two: sim+UI) then `git push origin main`. Pages deploys for user testing.

## Definition of done

All four gates green AND new m4 tests present AND docs updated AND everything committed AND pushed to main.

## Godot migration (starts only after Definition of done above)

Locked decisions: GDScript (not C# — no web export) · single-threaded Web export · side-by-side under `godot/` while TS stays live on Pages · parity before visuals · engine at `C:\Users\mayha\Documents\Godot\` (console exe for MCP output capture).

12. **Tooling** — GODOT_PATH already points at the console exe in `opencode.json`; verify godot-mcp end-to-end: get_godot_version, launch_editor, run_project + get_debug_output capture.
13. **iPhone spike (STOP GATE)** — minimal Godot project: hex field, one tower, one walking enemy; single-threaded Web export preset; serve over LAN (`npx http-server`, same Wi-Fi) and play on the user's iPhone. Pass = acceptable load + playable touch controls on device; fail = stop and reassess with user before any further porting.
14. **Bootstrap `godot/`** — project.godot, `scripts/sim/`, `scripts/data/`, `scenes/`, GUT addon installed, `.gitignore` += `.godot/`, one smoke test green under `godot --headless`.
15. **Port data tables** — `src/data/{structures,enemies,waves,levels,level1}.ts` → GDScript modules; every cost/radius/dps/hp/wave value must match TS exactly (parity test compares both).
16. **Port sim core** — hex/grid/flowfield/game/enemy/ally/structures/types/events → GDScript; port the ~46 Vitest assertions into GUT suites mirroring hex/game/m2/m3/m4 coverage; all green headless.
17. **Renderer rebuild** — hex field mesh, procedural MeshInstance3D towers (all 9 kinds incl. watching eye), two-tone warm-key + moon-fill lighting, violet fog, quiet path-flow arrows, red capsules w/ poison tint, resident witches w/ idle animation, aspect-aware camera + battle blend (per VISUAL_NOTES.md).
18. **Input & camera** — raycast pick/place/tap/select, pan/pinch zoom, two-tap confirm on touch, Escape/right-click cancel — UX parity with TS version.
19. **HUD Control nodes** — palette (9 cards), topbar ritual/stability, wave/speed/pause, structure + enemy inspect panels (scout-gated weakness row), boss-intro banner, destruction warnings.
20. **Saves & menu** — `user://` JSON saves compatible with current schema, level select with locks, campaign map-size picker (11x7..19x12).
21. **Parity sweep** — design.md walked § by § against the running game; captured screenshots (desktop 1280x800 + mobile portrait) judged side-by-side against `docs/screenshots/` baseline; fix every gap named.
22. **Flip CI/deploy** — Actions: `godot --headless` import + GUT gate + `--export-release "Web"` → Pages artifact under `/HexBound/`; verify live URL on iPhone once; TS stack archived to `legacy-ts`; rewrite AGENTS.md commands/layout/gotchas for Godot; update README/TOWERS/VISUAL_NOTES pointers.

### Migration definition of done

iPhone spike passed · GUT suites green headless · parity sweep clean vs design.md and screenshot baseline · Pages serves the Godot build · TS archived to `legacy-ts` · AGENTS/docs updated · everything committed and pushed.
