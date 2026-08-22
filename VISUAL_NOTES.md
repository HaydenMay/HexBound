# VISUAL_NOTES.md — Why the battlefield looks the way it does

Best shots live in [`docs/screenshots/`](docs/screenshots/) (desktop 1280×800, mobile Pixel 7 portrait), captured mid-wave with all eight structures placed via the `SHOTS=1` Playwright harness (`e2e/screenshot.spec.ts`).

## What changed, and why it works

**Diorama framing instead of floating hexes.** The old scene was a purple island in an infinite black void. Now a ridge of dark procedural spires hugs the map's back edge and pokes down from the top of frame like a tabletop miniature's backdrop. It hides the world's edge, gives the eye a ceiling, and makes the battlefield feel *placed* rather than *rendered*. Geometry note: with a ~52° camera pitch the frustum never sees the horizon, so backdrop objects must hug the grid's last row — anything farther is mathematically invisible. The ridge is tuned to that constraint.

**Two-tone lighting.** One warm key light (candle/torch side) plus a cool blue moon fill from opposite quarters. Structures now shade in two hues instead of one flat tone, which separates silhouettes without any textures. The fog color warmed toward violet (`0x181128`, near 28 / far 80) so distant tiles melt into atmosphere instead of cutting off hard.

**Quiet arrows, loud towers.** Path-flow cones dropped from opacity 0.38 → 0.22 and shrank ~30%. They used to be the loudest thing on screen; now the *towers* are, which is what the player is actually shopping between. The path still reads at a glance — it just whispers.

**Aspect-aware camera.** Camera distance previously assumed landscape: portrait phones saw five hexes and a prayer. Distance now scales with viewport aspect (`1.55/aspect`, clamped ×1–2.5), so mobile portrait fits the full battlefield width by default while desktop is unchanged.

**Readable villains.** Enemies stay saturated red capsules against the cool field — maximum hue separation from every player structure color (green grove/ring, teal well, purple idol/ritual, white mirror/palisade, amber brew). Poisoned enemies tint green on top of that, so curse status reads from across the table.

**Living towers sell the fantasy.** Every structure has a resident witch/shaman/keeper with idle animation, and the cauldron's witch stirs faster with a pulsing brew whenever someone is actively being cursed — state you can read from across the room without reading a single number.

## Known follow-ups

- On narrow portraits the ritual progress label truncates next to the stability pips; needs a responsive topbar pass.
- Enemy bodies are plain capsules; a simple two-tone split (body/head tint) would add character cheaply.
- All art stays procedural per the assets policy in [TOWERS.md](TOWERS.md).
