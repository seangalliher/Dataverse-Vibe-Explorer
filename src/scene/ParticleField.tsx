import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 2000

export function ParticleField() {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const { offsets, speeds, phases } = useMemo(() => {
    const offsets = new Float32Array(PARTICLE_COUNT * 3)
    const speeds = new Float32Array(PARTICLE_COUNT)
    const phases = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      offsets[i * 3] = (Math.random() - 0.5) * 200
      offsets[i * 3 + 1] = Math.random() * 40 - 5
      offsets[i * 3 + 2] = (Math.random() - 0.5) * 200

      speeds[i] = 0.1 + Math.random() * 0.3
      phases[i] = Math.random() * Math.PI * 2
    }
    return { offsets, speeds, phases }
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const baseX = offsets[i * 3]
      const baseY = offsets[i * 3 + 1]
      const baseZ = offsets[i * 3 + 2]
      const speed = speeds[i]
      const phase = phases[i]

      // Gentle sine wave drift
      const x = baseX + Math.sin(t * speed * 0.3 + phase) * 2
      const y = baseY + Math.sin(t * speed * 0.5 + phase * 1.5) * 1.5
      const z = baseZ + Math.cos(t * speed * 0.2 + phase * 0.7) * 2

      const scale = 0.03 + Math.sin(t * speed + phase) * 0.015

      dummy.position.set(x, y, z)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, PARTICLE_COUNT]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="#00f0ff"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  )
}
