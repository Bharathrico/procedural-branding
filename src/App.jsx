import { useEffect, useRef, useState } from 'react'
import DrawCanvas from './components/DrawCanvas'

const TOOLS = [
  { id: 'select', key: 'v' },
  { id: 'square', key: '1' },
  { id: 'rectangle', key: '2' },
  { id: 'circle', key: '3' },
]
const FILL_TYPES = ['solid', 'linear', 'radial']
const SWATCHES = ['#f2f2f2', '#ff5a36', '#ffc233', '#2ec27e', '#3d7bff', '#9b5cff']
const GRADIENTS = [
  ['#ff5a36', '#ffc233'],
  ['#3d7bff', '#9b5cff'],
  ['#2ec27e', '#3d7bff'],
  ['#ff5a36', '#9b5cff'],
  ['#f2f2f2', '#3d7bff'],
]

// A fill keeps every field so switching type never loses the other settings.
const DEFAULT_FILL = { type: 'solid', color: SWATCHES[0], from: GRADIENTS[0][0], to: GRADIENTS[0][1], angle: 90 }

// Small circular swatch that opens the native color picker.
function ColorInput({ value, onChange, label, rainbow = false }) {
  return (
    <label className={`swatch picker${rainbow ? ' custom' : ''}`} style={{ '--swatch': value }} title={label}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
    </label>
  )
}

export default function App() {
  const [tool, setTool] = useState('rectangle')
  const [fill, setFill] = useState(DEFAULT_FILL)
  // Shapes and their undo history live together so every update sees both.
  const [doc, setDoc] = useState({ shapes: [], past: [] })
  const { shapes, past } = doc
  const [selectedId, setSelectedId] = useState(null)
  const nextId = useRef(1)
  // Consecutive edits with the same key (e.g. dragging a color picker) share one undo step.
  const lastMergeKey = useRef(null)

  // Apply `update` to the shapes, recording an undo step unless it merges with the last one.
  const commit = (update, mergeKey = null) => {
    const merge = mergeKey != null && mergeKey === lastMergeKey.current
    lastMergeKey.current = mergeKey
    setDoc((d) => ({ shapes: update(d.shapes), past: merge ? d.past : [...d.past, d.shapes] }))
  }

  const add = (shape) => {
    const id = nextId.current++
    commit((list) => [...list, { ...shape, id }])
  }
  const change = (shape) => commit((list) => list.map((s) => (s.id === shape.id ? shape : s)))
  const remove = () => {
    if (selectedId == null) return
    commit((list) => list.filter((s) => s.id !== selectedId))
    setSelectedId(null)
  }
  const clear = () => {
    commit(() => [])
    setSelectedId(null)
  }
  const undo = () => {
    lastMergeKey.current = null
    setDoc((d) => (d.past.length ? { shapes: d.past.at(-1), past: d.past.slice(0, -1) } : d))
    setSelectedId(null)
  }

  const chooseTool = (id) => {
    setTool(id)
    if (id !== 'select') setSelectedId(null)
  }

  // Selecting a shape loads its fill into the controls.
  const select = (id) => {
    setSelectedId(id)
    const shape = shapes.find((s) => s.id === id)
    if (shape) setFill(shape.fill)
  }

  // Fill edits apply to the next shape drawn, and to the selected shape if there is one.
  const updateFill = (patch) => {
    const next = { ...fill, ...patch }
    setFill(next)
    if (selectedId != null) {
      commit((list) => list.map((s) => (s.id === selectedId ? { ...s, fill: next } : s)), `fill:${selectedId}`)
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') return undo()
      if (e.key === 'Delete' || e.key === 'Backspace') return remove()
      if (e.key === 'Escape') return setSelectedId(null)
      const t = TOOLS.find((t) => t.key === e.key.toLowerCase())
      if (t) chooseTool(t.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const gradient = fill.type !== 'solid'

  return (
    <>
      <DrawCanvas
        tool={tool}
        fill={fill}
        shapes={shapes}
        selectedId={selectedId}
        onAdd={add}
        onChange={change}
        onSelect={select}
      />

      <div className="toolbar">
        {TOOLS.map((t) => (
          <button key={t.id} className={tool === t.id ? 'active' : ''} onClick={() => chooseTool(t.id)} title={`${t.id} (${t.key.toUpperCase()})`}>
            {t.id}
          </button>
        ))}
        <span className="divider" />
        <button onClick={undo} disabled={!past.length} title="Undo (Ctrl+Z)">undo</button>
        <button onClick={remove} disabled={selectedId == null} title="Delete (Del)">delete</button>
        <button onClick={clear} disabled={!shapes.length}>clear</button>
      </div>

      <div className="toolbar bottom">
        {FILL_TYPES.map((t) => (
          <button key={t} className={fill.type === t ? 'active' : ''} onClick={() => updateFill({ type: t })}>
            {t}
          </button>
        ))}
        <span className="divider" />

        {!gradient ? (
          <>
            {SWATCHES.map((c) => (
              <button
                key={c}
                className={`swatch${fill.color === c ? ' selected' : ''}`}
                style={{ '--swatch': c }}
                onClick={() => updateFill({ color: c })}
                aria-label={`Fill ${c}`}
                title={c}
              />
            ))}
            <ColorInput value={fill.color} onChange={(color) => updateFill({ color })} label="Custom color" rainbow />
          </>
        ) : (
          <>
            {GRADIENTS.map(([from, to]) => (
              <button
                key={from + to}
                className={`swatch${fill.from === from && fill.to === to ? ' selected' : ''}`}
                style={{ '--swatch': `linear-gradient(135deg, ${from}, ${to})` }}
                onClick={() => updateFill({ from, to })}
                aria-label={`Gradient ${from} to ${to}`}
              />
            ))}
            <span className="divider" />
            <ColorInput value={fill.from} onChange={(from) => updateFill({ from })} label="Start color" />
            <button className="icon" onClick={() => updateFill({ from: fill.to, to: fill.from })} title="Swap colors" aria-label="Swap colors">⇄</button>
            <ColorInput value={fill.to} onChange={(to) => updateFill({ to })} label="End color" />
            {fill.type === 'linear' && (
              <label>
                angle
                <input type="range" min="0" max="359" step="1" value={fill.angle} onChange={(e) => updateFill({ angle: +e.target.value })} />
              </label>
            )}
          </>
        )}
      </div>
    </>
  )
}
