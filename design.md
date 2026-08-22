Absolutely. I’d make the prompt **much more explicit about the build environment, deployment, prototype scope, and the fact that this is a game that should actually be playable immediately**, rather than letting the AI spend its entire effort architecting systems.

I’d also make **GitHub Pages + GitHub Actions the first setup instruction**, so the agent knows from the beginning that the deliverable is a deployable web game.

Here’s the full prompt I’d use.

---

# HEXBOUND — BUILD PROMPT

**Settings: Genre = Tower Defense / Strategy, Style = Stylized 3D, Setting = Dark Fantasy / Witchcraft, Multiplayer = off, Platform = Desktop + Mobile Web.**

Build a complete playable browser game called **HEXBOUND**.

The game is a **3D path-building tower defense game where the player is the villain**.

The player controls a coven of witches performing forbidden rituals. Armies of humans, knights, priests, witch hunters, mages and other enemies are trying to cross the battlefield and reach the ritual site before the ritual completes.

The defining mechanic is:

> **THE PLAYER CREATES THE ENEMY'S PATH.**

There is **no predefined road**.

The battlefield begins as an open area.

If the player places nothing, enemies simply walk directly from their entrance toward the ritual.

Every defensive structure the player places changes the traversable space and therefore changes the route enemies take.

The player is effectively building a magical maze while simultaneously defending the ritual.

---

# 0. DEPLOYMENT — DO THIS FIRST

Before building gameplay, configure the project so it can be deployed automatically to **GitHub Pages using GitHub Actions from the main branch**.

The finished repository must include:

- a working GitHub Pages deployment
- a GitHub Actions workflow
- automatic deployment whenever changes are pushed to `main`
- a production build that works from the GitHub Pages URL
- correct handling of asset paths when hosted from a GitHub Pages subpath
- no dependence on a local development server for the deployed game

Create the required workflow under:

`.github/workflows/`

The workflow should:

1. Check out the repository.
2. Install dependencies.
3. Build the production version.
4. Upload the generated site as a Pages artifact.
5. Deploy it to GitHub Pages.

Configure the project for the appropriate GitHub Pages base path rather than assuming the game is hosted at `/`.

The game must be playable by opening the deployed GitHub Pages URL.

**Do not leave deployment until the end. Set this up before implementing the game so deployment problems are discovered immediately.**

---

# 1. CORE GAME

Create a 3D tower-defense game with a large open battlefield.

The player has a central **RITUAL SITE**.

Enemies enter from one or more designated entrances around the edges of the map.

Their objective is to reach the ritual.

The player places magical structures throughout the open battlefield.

Structures alter the enemy's available route.

There is **NO predefined road**.

There is **NO tower capacity limit**.

A player may eventually place 10, 50, 100 or more structures if they can afford them.

The strategic restriction is not tower count.

The restriction is:

> **THE PLAYER MAY NEVER COMPLETELY BLOCK ALL PATHS TO THE RITUAL.**

Whenever the player places or upgrades a structure, the game must verify that every relevant enemy entrance still has at least one valid navigable route to the ritual.

If a placement would completely seal the route, reject the placement and clearly communicate why.

Do not create arbitrary invisible restrictions.

The player should be free to create extremely complicated mazes.

---

# 2. THE GAME'S IDENTITY

Do NOT make this a generic medieval tower-defense game.

The player is a **witch / spellcaster / occult ritualist**.

The structures are not conventional towers.

They are:

- cursed objects
- magical shrines
- ritual circles
- cauldrons
- totems
- portals
- altars
- enchanted trees
- forbidden artifacts
- summoned creatures
- magical traps

The player should feel like they are **constructing a supernatural killing ground**.

The enemies are not simply monsters.

They are forces attempting to stop the ritual.

Possible enemies include:

- villagers
- militia
- hunters
- knights
- priests
- witch hunters
- paladins
- mages
- assassins
- siege units
- elite inquisitors
- bosses

The player is explicitly the antagonistic force.

---

# 3. THE RITUAL

Every level revolves around completing a ritual.

The central structure should be visually important.

Call it the **RITUAL SITE** for now.

The ritual has a progress meter.

Enemies that reach the ritual damage its stability.

If stability reaches zero, the player loses.

The player wins when the ritual reaches 100%.

The ritual should visibly evolve as it progresses.

For example:

- magical energy begins gathering
- runes illuminate
- candles ignite
- particles intensify
- the ritual circle expands
- magical beams rise into the sky
- the environment becomes increasingly corrupted

The final completion should feel significant.

---

# 4. THE BATTLEFIELD

Create a large 3D open area.

For the first prototype, use simple low-poly placeholder geometry.

Do NOT spend excessive time creating detailed assets.

The prototype should prioritize:

1. gameplay
2. pathfinding
3. placement
4. enemy behavior
5. UI
6. progression
7. game feel

Use simple:

- cubes
- cylinders
- planes
- low-poly rocks
- simple trees
- primitive magical objects

for early assets.

The visual direction should eventually become:

**stylized dark fantasy**

rather than photorealism.

Think:

- exaggerated silhouettes
- chunky magical structures
- readable colors
- strong spell effects
- stylized environments
- slightly sinister but approachable fantasy

Do not make the game horror.

---

# 5. PATH-BUILDING IS THE CORE MECHANIC

This is the most important system in the entire game.

Enemies need to continuously navigate from:

**ENTRANCE → RITUAL**

through the open battlefield.

Structures create obstacles and influence routes.

The player should be able to create:

- long winding paths
- switchbacks
- loops
- corridors
- chambers
- choke points
- multiple branches
- intentionally inefficient routes

Example:

```text
ENTRY
 ↓
████████████
→ → → → ↓
↑ ← ← ← ↓
↑ → → → ↓
↑ ↓
↑ → → → → RITUAL
```

The player should be rewarded for creating routes that expose enemies to defenses repeatedly.

---

# 6. PATH VALIDATION

Never allow the player to accidentally make the ritual unreachable.

Before confirming a placement:

1. temporarily place the structure
2. recalculate navigation
3. test every active entrance
4. verify a route exists
5. accept the placement only if valid

If invalid:

> **THE RITUAL MUST REMAIN REACHABLE**

Display a simple visual warning.

Do not use a text-heavy explanation.

The blocked area should briefly highlight.

---

# 7. STRUCTURES

Do NOT create generic tower-defense towers.

Avoid a basic set like:

- Archer Tower
- Cannon Tower
- Fire Tower
- Ice Tower
- Slow Tower

Instead, every structure should introduce a distinct strategic idea.

The initial prototype should contain approximately **8–10 structures**.

They should be substantially different from one another.

---

## BLOOD CAULDRON

A curse structure.

Enemies entering its radius receive a stacking poison effect.

The poison should not simply be a generic damage-over-time effect.

Possible upgrade paths:

### PLAGUE

Poison spreads between nearby enemies.

### HEMORRHAGE

Poisoned enemies take increasing damage as they remain alive.

### BLIGHT

When a poisoned enemy dies, it leaves behind a temporary corrupted area.

---

# 8. WHISPERING IDOL

A mind-control structure.

It periodically takes control of an enemy.

The controlled enemy temporarily becomes an ally and attacks nearby enemies.

This is one of the signature structures.

Upgrade paths:

### DOMINATION

Control stronger enemies.

### MADNESS

Controlled enemies deal increased damage but behave unpredictably.

### POSSESSION

When the controlled enemy dies, the spell jumps to another enemy.

Bosses should be resistant or immune.

---

# 9. WITCH GATE

A magical portal.

It does not deal conventional damage.

It periodically selects an eligible enemy and **teleports it backward toward its entrance**.

This is NOT a slow effect.

The enemy is physically repositioned.

Long cooldown.

Bosses are immune.

Upgrade paths could include:

### RIFT

More frequent teleportation.

### RETURN

Enemies are sent significantly farther backward.

### LOOP

Rarely sends an enemy almost all the way back to its entrance.

The visual effect should make it extremely obvious what happened.

---

# 10. STORM TOTEM

A magical Tesla-like structure.

It performs poorly against isolated targets.

When several enemies are close together, lightning jumps between them.

Example:

```text
Enemy → Enemy → Enemy → Enemy
       ⚡       ⚡       ⚡
```

This creates a strategic interaction:

**The player wants to deliberately create congestion.**

Upgrade paths could focus on:

- longer chains
- stronger initial strike
- chain damage
- electrified enemies
- increased effectiveness against groups

---

# 11. BONE CIRCLE

A necromantic structure.

Enemies killed inside its influence have a chance to rise temporarily as allied skeletons.

Skeletons attack nearby enemies.

The skeletons disappear after a period of time.

Upgrade paths:

- more skeletons
- stronger skeletons
- longer duration
- elite skeleton chance

---

# 12. SACRIFICIAL ALTAR

A support structure.

It becomes stronger as enemies die nearby.

The player can eventually sacrifice one of their summoned creatures to trigger a powerful effect.

This should create an actual strategic decision rather than simply being another damage structure.

---

# 13. THORN GROVE

A magical environmental structure.

Creates an area that enemies strongly prefer to avoid.

This is important:

**It influences pathfinding without simply becoming a wall.**

The player can use it to bend enemy routes.

Upgrade paths could increase:

- avoidance strength
- area
- damage
- duration
- interactions with poison/curses

---

# 14. WATCHING EYE

An information structure.

It does little or no direct damage.

Instead it reveals enemy information.

It can reveal:

- resistances
- weaknesses
- special abilities
- elite status
- path preferences
- hidden traits

Higher upgrades provide better battlefield information.

This establishes that not every structure exists to deal damage.

---

# 15. SPELL MIRROR

A magical reactive structure.

When hit by certain enemy abilities, it has a chance to reflect or copy the effect.

This should create interesting interactions with enemy spellcasters.

---

# 16. STRUCTURE UPGRADE TREES

Structures must eventually have **branching upgrade paths**.

Do NOT make every tower a simple:

> Level 1 → Level 2 → Level 3 → Level 4

system.

At higher levels, structures should branch into different identities.

Example:

```text
             BLOOD CAULDRON
                   │
             ┌─────┴─────┐
             │           │
          PLAGUE      HEMORRHAGE
             │           │
          BLIGHT       BLOODFIRE
             │           │
          CORRUPTION   SOUL FEAST
```

The exact number of tiers can be tuned later.

The important principle is:

> **Upgrading should change how the structure plays, not merely make its numbers bigger.**

Take inspiration from the philosophy of modern branching tower-defense upgrade systems, but create completely original mechanics, names, visuals and interactions.

Do not copy another game's tower designs.

---

# 17. NO TOWER CAP

There is intentionally **no global tower limit**.

If a player wants to fill much of the map with basic structures to construct a massive maze, allow them to.

The balancing mechanisms are:

- money
- placement space
- path requirements
- upgrade costs
- opportunity cost
- enemy scaling

Do NOT artificially limit the player to something like 20 towers.

The late game should allow ridiculous defensive constructions.

---

# 18. ECONOMY

Use a simple currency initially.

Call it **ESSENCE**.

Enemies provide Essence when defeated.

Structures cost Essence.

Upgrades cost Essence.

Do not introduce five currencies into the prototype.

Later systems can expand the economy if necessary.

---

# 19. ENEMY DESIGN

Enemies should exist specifically to challenge different strategies.

Initial prototype enemies:

### COMMON MILITIA

Basic enemy.

### RUNNER

Fast and fragile.

### KNIGHT

Slow and durable.

### PRIEST

Resistant to curses.

### WITCH HUNTER

Prioritizes magical structures.

### MAGE

Uses ranged attacks against structures.

### PALADIN

Can cleanse nearby negative effects.

### ELITE INQUISITOR

Strong anti-magic unit.

### BOSS

Large, dangerous, resistant to special effects.

Bosses should not simply have enormous HP.

Give them mechanics.

Examples:

- immune to teleportation
- cleanses curses
- temporarily disables nearby structures
- summons reinforcements
- creates alternate routes
- ignores certain path penalties

---

# 20. ENEMY AI

Enemies should use the navigation system intelligently.

They should attempt to reach the ritual.

The path should update whenever the battlefield changes.

Do not constantly make enemies jitter or completely recalculate every frame.

Use efficient pathfinding.

The system should be capable of supporting large numbers of enemies.

---

# 21. WAVES

Start with a simple wave system.

Each wave has:

- enemy composition
- spawn rate
- difficulty
- reward

Wave composition should eventually create strategic problems.

Example:

**Wave 8**

Lots of runners + several knights.

The player realizes their long maze is great against slow enemies but runners are slipping through.

---

# 22. WAVE PREVIEW

Before starting a wave, show the upcoming enemy types.

Make the player decide:

> "How should I alter my maze?"

The player should be able to prepare.

Do not hide everything.

Strategy should come from responding to information.

---

# 23. MAP DESIGN

The initial map should be deliberately simple.

Large square/rectangular battlefield.

Multiple possible entrances.

Central ritual.

Scattered environmental decoration.

Later maps can introduce:

- cliffs
- water
- forests
- ruins
- bridges
- chokepoints
- multiple ritual sites
- moving environmental hazards

But the first map should primarily test the core path-building system.

---

# 24. CAMERA

Third-person elevated strategy camera.

The player should see a large portion of the battlefield.

Controls:

- mouse drag to pan
- scroll to zoom
- WASD or edge scrolling for camera movement
- mobile touch drag to pan
- pinch to zoom

Structures should remain readable when zoomed out.

---

# 25. PLACEMENT

Desktop:

- select structure
- move cursor over battlefield
- preview placement
- show its influence radius
- show predicted path changes
- click to place

Mobile:

- tap structure
- tap battlefield
- drag for camera movement
- pinch to zoom

Placement must feel extremely responsive.

---

# 26. PLACEMENT PREVIEW

When hovering over a structure:

Show:

- structure ghost
- range
- affected area
- whether placement is valid
- enemy route preview if useful

If placement blocks the ritual:

**red invalid visualization**

If valid:

**clear placement visualization**

The game should make path manipulation understandable without requiring a tutorial.

---

# 27. VISUAL FEEDBACK

The game should constantly communicate:

- where enemies are going
- what structures affect them
- why an enemy is being affected
- why a path changed
- when a ritual is in danger
- when an upgrade changes behavior

Use:

- glowing paths
- spell particles
- status icons
- hit effects
- floating damage indicators sparingly
- clear range circles
- path previews

Avoid visual clutter.

---

# 28. ART DIRECTION

Stylized low-poly 3D.

Do not attempt photorealism.

Use:

- bold silhouettes
- simplified geometry
- saturated magical effects
- dark greens
- purples
- crimson
- bone white
- black
- glowing magical accents

The environment should feel like:

**a beautiful but forbidden magical place.**

Not horror.

Not realistic medieval Europe.

Not generic fantasy MMO.

---

# 29. PLACEHOLDER ASSETS

For the initial build, use primitive geometry.

A structure can initially be:

- cylinder
- cube
- cone
- glowing orb
- simple rune

An enemy can initially be:

- colored low-poly humanoid
- simple capsule/body
- basic weapon silhouette

Prioritize functionality.

Assets can be replaced later.

Design the code so replacing placeholder meshes with final assets does not require rewriting gameplay systems.

---

# 30. FUTURE ASSET PIPELINE

Keep visual assets modular.

Structures should have:

- base mesh
- magical effect layer
- upgrade visual
- selection highlight
- placement ghost

Enemies should have:

- body
- equipment
- effects
- health/status indicators

Do not hardcode gameplay logic into individual models.

---

# 31. UI

Desktop and mobile responsive.

Main HUD:

**TOP**

- Essence
- wave number
- ritual progress

**BOTTOM / SIDE**

Structure selection

Selected structure information

Upgrade controls

Wave controls

Keep the UI clean.

Avoid enormous blocks of text.

Use icons wherever practical.

---

# 32. RITUAL DAMAGE

When an enemy reaches the ritual:

- ritual flashes
- enemy is consumed/repelled
- ritual stability decreases
- strong sound effect
- visual feedback

The player should immediately understand:

> "Something got through."

---

# 33. GAME SPEED

Provide:

- 1×
- 2×
- 3×

and pause.

The game should remain playable at higher speeds.

---

# 34. MOBILE

The game is primarily intended for **desktop and mobile web**.

It must be touch friendly.

Use:

- large buttons
- large placement targets
- no tiny controls
- pinch zoom
- drag camera
- tap placement
- responsive UI

Avoid requiring hover-only information.

---

# 35. PROGRESSION

The first prototype only needs a simple progression system.

After completing a level:

- gain Essence or progression currency
- unlock a new structure or upgrade branch
- advance to another ritual

Eventually the game can expand into a larger campaign.

Do not overbuild meta progression before the core game is fun.

---

# 36. LEVEL STRUCTURE

Prototype with approximately:

**5 levels**

Each introduces something new.

### LEVEL 1

Basic path building.

### LEVEL 2

Introduce fast enemies.

### LEVEL 3

Introduce anti-magic enemies.

### LEVEL 4

Introduce multiple entrances.

### LEVEL 5

Boss ritual assault.

---

# 37. THE FIRST PLAYABLE BUILD

The first milestone is NOT the entire game.

The first milestone is:

> **One complete playable ritual defense.**

It must contain:

- open battlefield
- entrance
- ritual
- enemies
- pathfinding
- structure placement
- path validation
- Essence
- waves
- at least 6 structures
- at least 4 enemy types
- upgrades
- win condition
- lose condition
- functional camera
- functional UI
- desktop controls
- basic mobile controls
- GitHub Pages deployment

This should be playable from start to finish.

---

# 38. GAME FEEL

The game should feel satisfying when the player changes the battlefield.

When a structure is placed:

**the route changes immediately.**

When a path changes:

**the enemies visibly react.**

When enemies become clustered:

**the Storm Totem chains lightning through them.**

When a controlled enemy turns against its allies:

**make the moment obvious.**

When the Witch Gate activates:

**make the enemy visibly disappear and reappear far backward.**

When a player creates a huge maze:

**make it feel like they outsmarted the enemy.**

The player's primary satisfaction should come from:

> **"I designed this."**

not:

> "My tower has a bigger damage number."

---

# 39. IMPORTANT DESIGN PRINCIPLE

Do not solve every problem with damage.

Every structure should answer a different strategic question.

Examples:

**Can I force enemies somewhere?**

**Can I make enemies bunch together?**

**Can I send one backward?**

**Can I turn an enemy against its allies?**

**Can I exploit enemy deaths?**

**Can I manipulate enemy priorities?**

**Can I punish certain enemy types?**

**Can I create a dangerous area?**

**Can I gain information?**

**Can I create a loop?**

This is what differentiates HEXBOUND from conventional tower defense.

---

# 40. DO NOT

Do NOT include:

- generic sci-fi aesthetics
- guns
- futuristic robots
- predefined roads
- tower capacity limits
- generic archer towers
- generic cannon towers
- generic slow towers
- generic freeze towers
- generic "damage +10%" upgrade trees
- pay-to-win mechanics
- multiplayer
- unnecessary accounts
- cloud saves
- complicated backend infrastructure
- placeholder copyrighted assets
- copyrighted game art
- copied tower designs
- copied UI from existing tower-defense games

Do not use assets from other games.

Do not use trademarked characters, names, logos or artwork.

---

# 41. TECHNICAL PRIORITIES

Keep the code modular.

Separate:

```text
simulation
navigation
gameplay
rendering
UI
data
save
audio
```

The simulation should not depend heavily on rendering.

Enemy movement, wave logic, structure behavior and path validation should be testable independently.

Structure definitions should be data-driven where practical.

Enemy definitions should be data-driven.

Upgrade trees should be data-driven.

This will make adding dozens of structures later much easier.

---

# 42. PERFORMANCE

Target:

**60 FPS on modern desktop browsers**

and

**60 FPS on reasonably capable mobile devices**, with graceful degradation.

Do not spawn unnecessary DOM elements for gameplay.

Prefer GPU-friendly rendering.

Do not create expensive pathfinding calculations every frame.

Pathfinding should update intelligently when structures change.

---

# 43. SAVE SYSTEM

For the prototype, use local browser persistence.

Save:

- progression
- unlocked structures
- completed levels
- settings

Use versioned save data from the beginning.

Include reset-save functionality in development.

Cloud saves are NOT required.

---

# 44. DEVELOPMENT PHILOSOPHY

**BUILD THE PLAYABLE GAME FIRST.**

Do not spend the majority of the implementation on architecture, menus, lore, placeholder art or elaborate backend systems.

The critical question is:

> **Is placing structures and watching the enemy route change fun?**

Build that first.

If the core loop is not fun, everything else is irrelevant.

---

# 45. FINAL TARGET

The finished prototype should feel like a **modern 2026 browser/mobile strategy game**, not a recreation of an old Flash game.

The inspiration is the unusual idea of **constructing the enemy's route**, but the implementation, art, mechanics, UI and identity must be original.

The player's fantasy should be:

> **I am the witch.**
>
> **This is my ritual.**
>
> **They are coming to stop me.**
>
> **I decide how they reach me.**
>
> **And every structure I place changes the battlefield.**

The defining gameplay loop is:

**BUILD → ALTER THE PATH → WATCH THE ENEMY ADAPT → EXPLOIT THE ROUTE → COMPLETE THE RITUAL → UNLOCK MORE FORBIDDEN MAGIC**

Build the first playable version now.

**Do not stop after generating a design or scaffold. Implement the actual game, run it, test it, fix obvious problems, and leave the repository in a playable/deployable state.**
    