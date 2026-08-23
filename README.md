# HexBound

A witchcraft tower defense game. They march to end your ritual; you decide the road they take.

- **Play:** push to `main` and GitHub Pages serves it (lint → test → build → deploy).
- **Towers & synergies:** see [TOWERS.md](TOWERS.md).
- **Stack:** TypeScript + Three.js + Vite, Vitest unit tests, Playwright e2e gate (desktop + mobile).
- **Know your foe:** tap any enemy on the field for live vitality and traits — scout its weakness with the Watching Eye tower (9 structures total).

## Develop

```sh
npm ci
npm run dev        # local dev server
npm test           # vitest
npm run test:e2e   # playwright (builds first via preview server)
npm run build      # tsc --noEmit && vite build → dist/
```

## Assets policy

Everything is procedural — Three.js geometry built in code (`makeStructureMesh` in `src/render/renderer.ts`), no image files. If custom pixel art ever lands: transparent ~64px PNGs slot into `makeStructureMesh` per structure kind; resident characters and idle animations stay procedural.
