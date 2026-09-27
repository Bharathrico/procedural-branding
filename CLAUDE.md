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

## Structure

```
src/
  main.jsx    # React entry
  App.jsx     # Canvas + scene root
  index.css   # global styles (full-bleed canvas)
```

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
