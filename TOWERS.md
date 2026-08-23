# TOWERS.md — The Coven's Works

Every structure the coven can raise, what it does, how it grows, and how the pieces conspire together. Costs are in **essence**. All towers are procedural meshes with a resident character living inside (yes, even the wall — look closer).

The foe roster you're up against: **Militia** (chaff), **Runners** (fast, frail), **Knights** (slow, 150 HP), **Priests** (80% curse-resistant), **Witch Hunters** (melee, smash structures), **Battle Mages** (snipe structures from 3 hexes out), **Paladins** (periodically cleanse curses from nearby allies — never themselves), **Elite Inquisitors** (silence your structures, uncharmable, chop walls), and the **Grand Inquisitor** (boss: mass silence, summons militia reinforcements, half curse-proof).

---

## Bone Palisade — 12e
*Cheap, dumb, and in the way. The maze piece.*

Non-damaging wall. Blocks the path and forces enemies to route around it. Does nothing else. It doesn't need to.

| Tier | Label | Cost | HP |
|---|---|---|---|
| 1 | Bone Fence | — | 70 |
| 2 | Stacked Ribs | 10e | 130 |
| 3 | Ossuary Bulwark | 18e | 200 |

- **Target for:** Witch Hunters (melee chops) and Battle Mages (ranged). Everything else ignores it.
- **Use:** maze-building is the strongest mechanic in the game. Walls pay for themselves by extending every other tower's firing time.
- **Upgrades are HP only** — a wall that dies slower *is* a better wall.

## Hex Cauldron — 40e
*Brews a stacking curse on nearby foes.*

Applies stacking poison to enemies in radius. Each stack ticks damage over time; stacks fall off after 4s without reapplication.

| Tier | Label | Cost | Radius | Curse |
|---|---|---|---|---|
| 1 | Simmering Brew | — | 2 | 4 dps/stack, max 5 |
| 2 | Thickened Brew | 45e | 2.5 | 5 dps/stack, max 6, then choose a fork |

Forks (tier 3, pick one):
- **Plague — 70e**: curse spreads to foes within 1.5 hexes when it takes hold.
- **Hemorrhage — 70e**: damage ramps +35%/sec the longer a foe has suffered.

- **Counter:** Priests shrug it off (80% curse resist).
- **Watch:** the witch stirs faster and the brew glows when someone's in the pot.

## Storm Totem — 60e
*Lightning arcs between clustered enemies.*

Periodic chain-lightning strike on the nearest foe; bolts jump between packed targets.

| Tier | Label | Cost | Dmg | Targets | Chain | Cooldown |
|---|---|---|---|---|---|---|
| 1 | Crackling Totem | — | 14 | 4 | 2.0 | 1.6s |
| 2 | Chained Storm | 55e | 18 | 5 | 2.2 | 1.5s |
| 3 | Tempest | 95e | 24 | 6 | 2.4 | 1.4s |

- **Use:** punishes tight formations. Your primary hard-delete against Knights when paired with slow/maze pressure.
- Ignores curse resistance entirely. Priests hate this one trick.

## Thorn Grove — 30e
*Briars foes refuse to cross. Bends their path without blocking it.*

Cheapest tower. Doesn't block — it makes nearby hexes expensive, so pathing detours around it while staying technically walkable. Enemies *can* push through if you leave them no choice.

| Tier | Label | Cost | Penalty |
|---|---|---|---|
| 1 | Briar Patch | — | 4 |
| 2 | Deep Briars | 35e | 7 |
| 3 | Impenetrable Thicket | 55e | 12 |

- **Use:** soft mazes. Stack groves to build corridors that Hunters can't simply chew through (they only attack `structureTarget` structures — groves aren't worth their axe).
- Immune to structure damage in practice. The hedge-witch keeper waters it nightly.

## Mushroom Ring — 65e
*The fallen rise briefly as spiteful sprites.*

Enemies who die inside the ring may rise as allied sprites that attack passersby for a few seconds.

| Tier | Label | Cost | Raise | Sprite dps | Lifetime | Max sprites |
|---|---|---|---|---|---|---|
| 1 | Fairy Circle | — | 35% | 6 | 8s | 3 |
| 2 | Spore Bloom | 50e | 50% | 8 | 10s | 4 |
| 3 | Fungal Court | 80e | 65% | 11 | 12s | 5 |

- **Synergy:** place *downstream* of your kill zone so corpses spawn where more enemies will walk.
- **Feeds:** the Moonwell (see below). Sprites are fuel.

## Whispering Idol — 55e
*Turns a foe against its own kin.*

Periodically charms one enemy: it stops marching, stops fighting, and its former friends get charmed-strike immunity from your other effects while held.

| Tier | Label | Cost | Charm dur | Cooldown | Concurrent |
|---|---|---|---|---|---|
| 1 | Soft Whisper | — | 5s | 8s | 1 |
| 2 | Insistent Voice | 50e | 7s | 6.5s | 1 |
| 3 | Choir of Whispers | 85e | 9s | 5s | 2 |

- **Use:** a rotating stall button. A held Knight is a Knight your cauldron gets to cook.
- Charmed foes can't be poisoned, re-charmed, or shot by your totem — they're *yours*, don't waste dots on them.

## Moonwell — 60e
*Feeds on deaths nearby. Can detonate a sprite.*

Grants essence for each enemy death in radius. Active ability: sacrifice one of your sprites for a damaging nova around the well.

| Tier | Label | Cost | e/death | Nova dmg | Nova r | CD |
|---|---|---|---|---|---|---|
| 1 | Moonlit Pool | — | 3 | 40 | 2.5 | 12s |
| 2 | Waxing Well | 45e | 4 | 55 | 3.0 | 10s |
| 3 | Full Moon Rite | 70e | 6 | 75 | 3.5 | 8s |

- **Economy engine:** pays for your late waves. Deaths near the well refund essence on top of bounties.
- **The loop:** Mushroom Ring raises corpses → sprites wander near the well → detonate them into the next pack. Death becomes income becomes death.

## Spell Mirror — 45e
*Tanky bait that returns aggression to the aggressor.*

A structureTarget wall with attitude: any Hunter or Mage striking it risks having their blow reflected back at full force.

| Tier | Label | Cost | Reflect chance | Factor |
|---|---|---|---|---|
| 1 | Silvered Glass | — | 35% | ×1.0 |
| 2 | Warded Glass | 35e | 50% | ×1.25 |
| 3 | Kaleidoscope | 60e | 65% | ×1.5 |

- **HP 120** — tankiest blocker per essence in the game.
- **Use:** park it where Hunters funnel in. They kill themselves on your architecture. The attendant dusts the glass between assaults; she insists it helps.

## Watching Eye — 35e
*Reveals foe weaknesses and sharpens them against their bane.*

An information structure — it deals no direct damage. Foes that pass inside the gaze get their type scouted *permanently* for the rest of the level (the enemy inspector's `???` resolves into their named weakness), and while a foe stands inside the radius, its weakness damage type bites harder.

| Tier | Label | Cost | Radius | Bane amp |
|---|---|---|---|---|
| 1 | Half-Open Lid | — | 3 | +15% |
| 2 | Wide Gaze | 40e | 3.75 | +25% |
| 3 | All-Seeing Iris | 60e | 4.5 | +35% |

- **Use:** cover your kill zone, not just the road — scouting needs a single pass, but the amp only pays while the foe stands in both radii.
- **Inspect:** tap any foe on the field for live vitality, trait tags (curse-proof, silencer, summoner…), and its bane once scouted.
- Not a wall (`blocksPath: false`, Hunters ignore it). The floating iris watches; the stone ring remembers.

---

## Synergy cheat-sheet

- **Groves → everything:** cheap path-bending extends time-in-range for every damage tower. Buy these first.
- **Palisade + Cauldron:** wall enemies into the curse radius. Poison wants loiterers.
- **Totem + chokepoints:** chains need clusters; mazes make clusters.
- **Ring + Well:** corpse economy — raise, wander, detonate, profit.
- **Idol + Totem:** charm holds the Knight still; lightning does the paperwork.
- **Mirror + Palisade front line:** hunters hit walls; mirrors return mail to sender.
- **Eye + everything:** scouting is permanent per foe type, and the bane amp stacks the deck — a Knight standing in Eye + Totem range takes +15–35% shock. Information that also deals damage.
- **Anti-Paladin:** their cleanse hits everyone-but-themselves every few seconds. Split formations or burst fast so one prayer can't absolve the whole pack.
- **Anti-Inquisitor:** silences shut down totems/cauldrons/idols for seconds at a time and they can't be charmed — beat them with geometry: walls, mirrors, thorns.
- **The Grand Inquisitor:** silences wide, summons militia behind you, shrugs half your curses. Keep a Mirror on his flank for his own summons' road and lean on raw totem damage over curses.
- **Anti-Priest:** Priests resist curses — bring the Totem (raw damage) and geometry, not poison.
- **Anti-structure:** Hunters/Mages only attack `structureTarget` works (Palisade, Mirror). Groves, wells, rings, idols, cauldrons, totems are beneath their notice.

## Battleground sizes

Every level runs Small / Medium / Large via the menu picker (applied at battlefield init, remembered between sessions). Medium is canonical balance; Small compresses the maze, Large gives you room for the full corpse-economy engine.

## Assets policy

Everything visual is procedural Godot primitive meshes built in `TowerMesh.build` (`godot/scripts/render/tower_mesh.gd`) — no image assets today, by design. If hand-drawn art ever enters the picture: transparent-background PNGs around ~64px drop straight in as sprite textures per structure kind at the top of `TowerMesh.build`; the resident characters and tick animations stay procedural regardless.
