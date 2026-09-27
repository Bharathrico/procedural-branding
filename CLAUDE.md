# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**procedural-branding** — a Vite + React (JSX, no TypeScript) playground for
generative brand identities rendered with Three.js. See `DESIGN.md` for the
design principles, tokens, and motion guidelines; follow it for any visual work.

## Stack

- **Vite** — dev server & build
- **React 19** (JSX)
- **three** + **@react-three/fiber** — declarative Three.js
- **@react-three/drei** — helpers (controls, environments, text, etc.)
- **gsap** + **@gsap/react** — animation (`useGSAP` hook)
- **oxlint** — linting

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build to dist/
npm run preview  # preview production build
npm run lint     # lint with oxlint
```

The dev server runs on **https** (`https://localhost:5173`) via
`vite-plugin-mkcert`, which generates a locally-trusted certificate on first run.

## Structure

```
src/
  main.jsx                    # React entry
  App.jsx                     # App state (shapes, tool, fill) + DOM toolbar
  components/DrawCanvas.jsx   # 2D canvas: drag to draw filled shapes (active screen)
  components/ShapeScene.jsx   # R3F canvas: draw on a plane, beveled extrusions (currently unused)
  lib/shapes.js               # Pure helpers: drag -> shape, shape measurements
  index.css                   # global styles (full-bleed canvas, toolbar, swatches)
```

Interaction: left-drag on the 2D canvas draws a square, rectangle or circle.
The Select tool (V) picks a shape; drag its handles to resize (squares and
circles stay uniform) or its body to move. Fill edits apply to the next shape
and to the selected one.

Data model: every shape is a box `{ id, type, x, y, w, h, fill }` in screen
pixels (circles use `w` as diameter). `fill` is
`{ type: 'solid' | 'linear' | 'radial', color, from, to, angle }`; gradients
are laid out relative to the shape's box. Undo history lives in the same state
object as the shapes (`App.jsx`). `ShapeScene.jsx` (3D extrusion, world units)
is kept for later but not mounted.

As the project grows, prefer:
- `src/scenes/` — top-level scenes
- `src/components/` — reusable 3D components
- `src/lib/` — pure procedural helpers (noise, seeded RNG, palette generation)
- `src/shaders/` — GLSL files

## Conventions

- JavaScript/JSX only — do not introduce TypeScript.
- Function components and hooks only.
- Procedural output must be **deterministic from a seed**; use a seeded RNG,
  never bare `Math.random()` for generation.
- Animate with GSAP via `useGSAP` (auto-cleanup). Use R3F `useFrame` for
  per-frame simulation; don't allocate objects inside `useFrame`.
- Keep geometry/material creation memoized (`useMemo`) or declarative.
- Only render R3F elements inside `<Canvas>`; DOM UI goes outside it.
