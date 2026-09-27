import { useEffect, useRef } from 'react'
import { makeShape, isDrawable, centre, contains, move, handlesFor, resize } from '../lib/shapes'

const BG = '#0b0b0c'
const SELECTION = '#4c8dff'
const HANDLE_SIZE = 8
const HIT = 6 // pointer tolerance around a handle, in px

const HANDLE_CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' }

// Canvas fill style for a shape: a solid color, or a gradient sized to its box.
function paint(ctx, shape) {
  const f = shape.fill
  if (f.type === 'solid') return f.color

  const [cx, cy] = centre(shape)
  let g
  if (f.type === 'linear') {
    const a = (f.angle * Math.PI) / 180
    const dx = Math.cos(a)
    const dy = Math.sin(a)
    // Half the box's extent along the gradient direction, so stops hit the edges.
    const half = (Math.abs(shape.w * dx) + Math.abs(shape.h * dy)) / 2
    g = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half)
  } else {
    const r = shape.type === 'circle' ? shape.w / 2 : Math.hypot(shape.w, shape.h) / 2
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  }
  g.addColorStop(0, f.from)
  g.addColorStop(1, f.to)
  return g
}

function tracePath(ctx, shape) {
  ctx.beginPath()
  if (shape.type === 'circle') {
    const [cx, cy] = centre(shape)
    ctx.arc(cx, cy, shape.w / 2, 0, Math.PI * 2)
  } else {
    ctx.rect(shape.x, shape.y, shape.w, shape.h)
  }
}

function drawShape(ctx, shape, preview = false) {
  ctx.save()
  tracePath(ctx, shape)
  ctx.fillStyle = paint(ctx, shape)
  if (preview) ctx.globalAlpha = 0.5
  ctx.fill()

  if (preview) {
    ctx.globalAlpha = 1
    ctx.strokeStyle = shape.fill.type === 'solid' ? shape.fill.color : shape.fill.from
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 4])
    ctx.stroke()
  }
  ctx.restore()
}

function drawSelection(ctx, shape) {
  ctx.save()
  ctx.strokeStyle = SELECTION
  ctx.lineWidth = 1
  ctx.strokeRect(shape.x + 0.5, shape.y + 0.5, shape.w, shape.h)

  ctx.fillStyle = '#ffffff'
  for (const h of handlesFor(shape)) {
    const x = Math.round(h.x - HANDLE_SIZE / 2) + 0.5
    const y = Math.round(h.y - HANDLE_SIZE / 2) + 0.5
    ctx.fillRect(x, y, HANDLE_SIZE, HANDLE_SIZE)
    ctx.strokeRect(x, y, HANDLE_SIZE, HANDLE_SIZE)
  }
  ctx.restore()
}

function handleAt(shape, p) {
  return handlesFor(shape).find((h) => Math.abs(p.x - h.x) <= HIT && Math.abs(p.y - h.y) <= HIT)
}

export default function DrawCanvas({ tool, fill, shapes, selectedId, onAdd, onChange, onSelect }) {
  const canvasRef = useRef(null)
  const stateRef = useRef({ shapes, selectedId })
  // Active pointer gesture: { mode: 'draw' | 'move' | 'resize', ...; draft: shape being edited }
  const dragRef = useRef(null)

  const selected = () => stateRef.current.shapes.find((s) => s.id === stateRef.current.selectedId)

  const redraw = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const drag = dragRef.current
    const draft = drag?.draft

    ctx.fillStyle = BG
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    for (const s of stateRef.current.shapes) drawShape(ctx, draft && draft.id === s.id ? draft : s)
    if (drag?.mode === 'draw' && draft) drawShape(ctx, draft, true)

    const sel = selected()
    if (sel) drawSelection(ctx, draft && draft.id === sel.id ? draft : sel)
  }

  useEffect(() => {
    stateRef.current = { shapes, selectedId }
    redraw()
  }, [shapes, selectedId])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      redraw()
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [])

  const point = (e) => ({ x: e.clientX, y: e.clientY })

  // Topmost shape under the pointer (last drawn wins).
  const shapeAt = (p) => stateRef.current.shapes.findLast((s) => contains(s, p))

  const updateCursor = (p) => {
    const canvas = canvasRef.current
    if (tool !== 'select') return (canvas.style.cursor = 'crosshair')
    const sel = selected()
    const handle = sel && handleAt(sel, p)
    canvas.style.cursor = handle ? HANDLE_CURSORS[handle.id] : shapeAt(p) ? 'move' : 'default'
  }

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = point(e)

    if (tool !== 'select') {
      dragRef.current = { mode: 'draw', start: p, draft: null }
      return
    }

    const sel = selected()
    const handle = sel && handleAt(sel, p)
    if (handle) {
      dragRef.current = { mode: 'resize', handle: handle.id, original: sel, draft: null }
      return
    }

    const hit = shapeAt(p)
    onSelect(hit ? hit.id : null)
    dragRef.current = hit ? { mode: 'move', start: p, original: hit, draft: null } : null
  }

  const onPointerMove = (e) => {
    const p = point(e)
    const drag = dragRef.current
    if (!drag) return updateCursor(p)

    if (drag.mode === 'draw') drag.draft = { ...makeShape(tool, drag.start, p), fill }
    if (drag.mode === 'move') drag.draft = move(drag.original, p.x - drag.start.x, p.y - drag.start.y)
    if (drag.mode === 'resize') drag.draft = resize(drag.original, drag.handle, p)
    redraw()
  }

  const onPointerUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    const draft = drag?.draft

    if (drag?.mode === 'draw' && isDrawable(draft, 1)) onAdd(draft)
    else if (draft && drag.mode !== 'draw' && isDrawable(draft, 1)) onChange(draft)
    else redraw()
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', cursor: tool === 'select' ? 'default' : 'crosshair', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  )
}
