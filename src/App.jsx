import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

function Mark() {
  const mesh = useRef()

  useGSAP(() => {
    gsap.to(mesh.current.rotation, {
      y: Math.PI * 2,
      duration: 8,
      ease: 'none',
      repeat: -1,
    })
    gsap.from(mesh.current.scale, { x: 0, y: 0, z: 0, duration: 1.2, ease: 'expo.out' })
  })

  return (
    <mesh ref={mesh}>
      <torusKnotGeometry args={[1, 0.32, 256, 32]} />
      <meshStandardMaterial color="#f2f2f2" metalness={0.6} roughness={0.25} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#0b0b0c']} />
      <Mark />
      <Environment preset="studio" />
      <OrbitControls enableDamping />
    </Canvas>
  )
}
