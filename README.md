# HexBound

A witchcraft tower defense game. They march to end your ritual; you decide the road they take.

- **Play:** push to `main` and GitHub Pages serves it (Godot import → GUT test gate → web export → deploy).
- **Towers & synergies:** see [TOWERS.md](TOWERS.md).
- **Stack:** Godot 4.6.1 (GDScript, gl_compatibility renderer) exported to WebAssembly; GUT unit tests. The original TypeScript + Three.js stack lives on under `legacy-ts/` as a parity reference and the data-table generator.
- **Know your foe:** tap any enemy on the field for live vitality and traits — scout its weakness with the Watching Eye tower (9 structures total).

## Develop

Requires the Godot 4.6.1 console binary (see `AGENTS.md` for the exact path and flags).

```sh
# unit tests (GUT, headless)
godot --headless --path godot -s addons/gut/gut_cmdln.gd

# import pass after adding scripts
godot --headless --path godot --import

# web export + local smoke test
mkdir dist-godot
godot --headless --path godot --export-release "Web" "../dist-godot/index.html"
node wasm-smoke.mjs   # serves dist-godot/ at /HexBound/, asserts a clean boot
```

## Assets policy

Everything is procedural — Godot primitive meshes built in code (`godot/scripts/render/tower_mesh.gd`), no image files. If custom pixel art ever lands: textures slot into `TowerMesh.build` per structure kind; resident characters and idle animations stay procedural.
