// Every shape is a box: { type, x, y, w, h } with (x, y) the min corner.
// Squares and circles always keep w === h (a circle's diameter is w).
// Units are up to the caller: pixels on the 2D canvas, world units in 3D.

const UNIFORM = new Set(['square', 'circle'])

// Turn a drag (start -> end) into a shape for the given tool.
export function makeShape(tool, start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y

  if (!UNIFORM.has(tool)) {
    return { type: tool, x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), w: Math.abs(dx), h: Math.abs(dy) }
  }

  // Square and circle keep equal sides, following the drag direction.
  const size = Math.max(Math.abs(dx), Math.abs(dy))
  return { type: tool, x: dx < 0 ? start.x - size : start.x, y: dy < 0 ? start.y - size : start.y, w: size, h: size }
}

export function isDrawable(shape, minSize = 0.02) {
  return !!shape && shape.w > minSize && shape.h > minSize
}

export function centre(shape) {
  return [shape.x + shape.w / 2, shape.y + shape.h / 2]
}

export function minSide(shape) {
  return Math.min(shape.w, shape.h)
}

export function contains(shape, p) {
  if (shape.type === 'circle') {
    const [cx, cy] = centre(shape)
    return Math.hypot(p.x - cx, p.y - cy) <= shape.w / 2
  }
  return p.x >= shape.x && p.x <= shape.x + shape.w && p.y >= shape.y && p.y <= shape.y + shape.h
}

export function move(shape, dx, dy) {
  return { ...shape, x: shape.x + dx, y: shape.y + dy }
}

// Resize handles: corners for every shape, edge midpoints only for free-aspect shapes.
export function handlesFor(shape) {
  const { x, y, w, h } = shape
  const r = x + w
  const b = y + h
  const corners = [['nw', x, y], ['ne', r, y], ['se', r, b], ['sw', x, b]]
  const edges = [['n', x + w / 2, y], ['e', r, y + h / 2], ['s', x + w / 2, b], ['w', x, y + h / 2]]
  const all = UNIFORM.has(shape.type) ? corners : [...corners, ...edges]
  return all.map(([id, hx, hy]) => ({ id, x: hx, y: hy }))
}

// Drag `handle` to point `p`; the opposite corner/edge stays anchored.
export function resize(shape, handle, p) {
  const right = shape.x + shape.w
  const bottom = shape.y + shape.h
  const ax = handle.includes('w') ? right : shape.x
  const ay = handle.includes('n') ? bottom : shape.y

  if (UNIFORM.has(shape.type)) return { ...shape, ...makeShape(shape.type, { x: ax, y: ay }, p) }

  const movesX = handle.includes('e') || handle.includes('w')
  const movesY = handle.includes('n') || handle.includes('s')
  const [x0, x1] = movesX ? [ax, p.x] : [shape.x, right]
  const [y0, y1] = movesY ? [ay, p.y] : [shape.y, bottom]
  return { ...shape, x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) }
}
