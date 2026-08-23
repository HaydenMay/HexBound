# HANDOFF — P2a/P2b in progress

Resume with `/gauntlet-loop finish P2a and P2b per HANDOFF.md`. Work through **Remaining** top to bottom; do not stop until **Definition of done** is met.

## Already committed on main (safe)

- `5f5e4e3` P1 interactions: sell/dismantle + refund preview, two-tap confirm on touch, battle camera blend, gem palette
- `53542d6` gauntlet-loop skill run-to-completion contract + AGENTS.md long-running rules

## WIP commit (local only, DO NOT PUSH until Definition of done)

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
