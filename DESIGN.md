# Design — Procedural Branding

A space for exploring brand identity systems that are **generated, not drawn**:
marks, patterns, and motion derived from parameters, seeds, and rules, rendered
in real time with WebGL.

## Principles

1. **System over artifact.** Every visual is the output of a function. Prefer
   exposing parameters (seed, density, palette index, tension) over hand-tuned
   one-offs.
2. **Deterministic by seed.** The same seed must always produce the same
   output, so identities are reproducible and shareable.
3. **Restraint.** One hero form per scene. Let lighting, material, and motion
   carry the character rather than stacking effects.
4. **Motion has intent.** Animations communicate state (enter, idle, respond,
   exit). No decorative motion without purpose.

## Visual foundations

### Color
| Token        | Value     | Use                          |
|--------------|-----------|------------------------------|
| `--bg`       | `#0b0b0c` | Canvas / page background     |
| `--fg`       | `#f2f2f2` | Primary text, default mesh   |
| `--muted`    | `#8a8a8f` | Secondary text, UI chrome    |
| `--accent`   | TBD       | Driven procedurally per seed |

Generated palettes should stay within a controlled range (e.g. OKLCH with
constrained lightness/chroma) so every seed stays on-brand.

### Typography
- Primary: **Inter** (system-ui fallback).
- Keep UI text small and quiet; the 3D scene is the focal point.

### Space & layout
- Full-bleed canvas by default. UI overlays sit on an 8px grid with 16px
  minimum gutters on mobile.

## 3D / rendering

- **Camera:** perspective, `fov 45`, default distance `z = 5`.
- **Lighting:** drei `<Environment preset="studio" />` as baseline; add key
  lights only when needed.
- **Materials:** start with `meshStandardMaterial`/`meshPhysicalMaterial`;
  move to custom shaders for procedural surface detail.
- **Performance:** `dpr={[1, 2]}`, reuse geometries/materials, avoid
  re-creating objects inside `useFrame`.

## Motion (GSAP)

| Purpose | Duration   | Easing        |
|---------|------------|---------------|
| Enter   | 0.8–1.2s   | `expo.out`    |
| Exit    | 0.4–0.6s   | `expo.in`     |
| Respond | 0.3–0.5s   | `power3.out`  |
| Idle    | 6s+, loop  | `none` / `sine.inOut` |

- Use `useGSAP` from `@gsap/react` for automatic cleanup.
- Respect `prefers-reduced-motion`: reduce idle loops and shorten transitions.
