import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { makeShape, isDrawable, centre, minSide } from '../lib/shapes'

const FOV = 45
const HOME = new THREE.Vector3(0, -1.6, 9)
const FG = '#f2f2f2'

// Outline around (0,0); the mesh is positioned at the shape's centre.
function outline(shape) {
  const s = new THREE.Shape()
  if (shape.type === 'circle') {
    s.absarc(0, 0, shape.w / 2, 0, Math.PI * 2, false)
  } else {
    const w = shape.w / 2
    const h = shape.h / 2
    s.moveTo(-w, -h)
    s.lineTo(w, -h)
    s.lineTo(w, h)
    s.lineTo(-w, h)
    s.closePath()
  }
  return s
}

function useDisposable(factory, deps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps)
  useEffect(() => () => value.dispose(), [value])
  return value
}

function BeveledShape({ shape, depth, bevel }) {
  const mesh = useRef()

  const geometry = useDisposable(() => {
    // Cap the bevel relative to the shape so thin shapes stay valid.
    const size = Math.min(bevel, minSide(shape) / 4)
    const geo = new THREE.ExtrudeGeometry(outline(shape), {
      depth,
      bevelEnabled: size > 0,
      bevelThickness: size,
      bevelSize: size,
      bevelOffset: -size, // inset so the footprint matches the drawing
      bevelSegments: 8,
      curveSegments: 64,
    })
    geo.translate(0, 0, -depth / 2)
    return geo
  }, [shape, depth, bevel])

  // Pop up out of the drawing plane when the shape is committed.
  useGSAP(() => {
    gsap.from(mesh.current.scale, { z: 0.001, duration: 0.8, ease: 'expo.out' })
  })

  const [x, y] = centre(shape)

  return (
    <mesh ref={mesh} geometry={geometry} position={[x, y, 0]} raycast={() => null} castShadow receiveShadow>
      <meshPhysicalMaterial color={FG} metalness={0.1} roughness={0.25} clearcoat={1} clearcoatRoughness={0.15} />
    </mesh>
  )
}

// Flat outline shown while dragging, before the shape is extruded.
function PreviewShape({ shape }) {
  const geometry = useDisposable(() => new THREE.ShapeGeometry(outline(shape), 64), [shape])
  const [x, y] = centre(shape)

  return (
    <mesh geometry={geometry} position={[x, y, 0.001]} raycast={() => null}>
      <meshBasicMaterial color={FG} transparent opacity={0.3} depthWrite={false} />
    </mesh>
  )
}

// Invisible plane at z = 0 that turns pointer drags into shapes.
function DrawingPlane({ tool, onAdd, floor }) {
  const [preview, setPreview] = useState(null)
  const start = useRef(null)

  const onPointerDown = (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    start.current = { x: e.point.x, y: e.point.y }
  }

  const onPointerMove = (e) => {
    if (!start.current) return
    setPreview(makeShape(tool, start.current, { x: e.point.x, y: e.point.y }))
  }

  const onPointerUp = (e) => {
    if (!start.current) return
    e.target.releasePointerCapture(e.pointerId)
    start.current = null
    if (isDrawable(preview)) onAdd(preview)
    setPreview(null)
  }

  return (
    <>
      <mesh onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <gridHelper args={[40, 40, '#26262a', '#161618']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, floor]} />
      {preview && <PreviewShape shape={preview} />}
    </>
  )
}

// Animates the camera back to the home view whenever `resetKey` changes.
function CameraReset({ resetKey }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls)

  useEffect(() => {
    if (!resetKey || !controls) return
    const tl = gsap.timeline({ onUpdate: () => controls.update() })
    tl.to(camera.position, { x: HOME.x, y: HOME.y, z: HOME.z, duration: 0.9, ease: 'expo.inOut' }, 0)
    tl.to(controls.target, { x: 0, y: 0, z: 0, duration: 0.9, ease: 'expo.inOut' }, 0)
    return () => tl.kill()
  }, [resetKey, camera, controls])

  return null
}

export default function ShapeScene({ tool, shapes, onAdd, depth, bevel, resetKey }) {
  return (
    <Canvas camera={{ position: HOME.toArray(), fov: FOV }} dpr={[1, 2]} shadows style={{ cursor: 'crosshair', touchAction: 'none' }}>
      <color attach="background" args={['#0b0b0c']} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[4, 6, 8]} intensity={1.5} castShadow />
      <Suspense fallback={null}>
        <Environment preset="studio" />
      </Suspense>

      {/* Grid sits just behind the extruded shapes so it never cuts through them. */}
      <DrawingPlane tool={tool} onAdd={onAdd} floor={-(depth / 2 + bevel) - 0.01} />
      {shapes.map((shape) => (
        <BeveledShape key={shape.id} shape={shape} depth={depth} bevel={bevel} />
      ))}

      {/* Left drag draws; right drag rotates (shift + right drag pans); wheel zooms. */}
      <OrbitControls
        makeDefault
        enableDamping
        mouseButtons={{ LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        touches={{ ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE }}
      />
      <CameraReset resetKey={resetKey} />
    </Canvas>
  )
}
