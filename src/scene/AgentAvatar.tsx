import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '@/store/appStore'

/** Holographic wireframe agent avatar that floats in the 3D world */
export function AgentAvatar() {
  const groupRef = useRef<THREE.Group>(null!)
  const coreRef = useRef<THREE.Mesh>(null!)
  const ringRefs = useRef<THREE.Mesh[]>([])

  const { agentThinking, chatOpen } = useAppStore()
  const visible = chatOpen

  // Orbiting particles
  const particleCount = 24
  const particlePositions = useMemo(() => {
    const arr: Array<{ phase: number; radius: number; speed: number; yOffset: number }> = []
    for (let i = 0; i < particleCount; i++) {
      arr.push({
        phase: (i / particleCount) * Math.PI * 2,
        radius: 0.8 + Math.random() * 0.4,
        speed: 0.5 + Math.random() * 1.0,
        yOffset: (Math.random() - 0.5) * 1.5,
      })
    }
    return arr
  }, [])

  useFrame(({ clock, camera }) => {
    if (!groupRef.current || !visible) return
    const t = clock.getElapsedTime()

    // Position avatar in front-right of camera
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    groupRef.current.position.copy(camera.position)
      .add(dir.multiplyScalar(8))
      .add(right.multiplyScalar(3))
    groupRef.current.position.y -= 1

    // Billboard — face camera
    groupRef.current.lookAt(camera.position)

    // Idle float
    groupRef.current.position.y += Math.sin(t * 1.2) * 0.15

    // Core pulse (faster when thinking)
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshBasicMaterial
      const speed = agentThinking ? 4 : 1.5
      mat.opacity = 0.4 + Math.sin(t * speed) * 0.2
    }

    // Ring rotations
    ringRefs.current.forEach((ring, i) => {
      if (ring) {
        const rotSpeed = agentThinking ? 2 : 0.5
        ring.rotation.x = t * rotSpeed * (i === 0 ? 1 : -0.7)
        ring.rotation.y = t * rotSpeed * (i === 0 ? 0.3 : 1)
      }
    })
  })

  if (!visible) return null

  return (
    <group ref={groupRef}>
      {/* Core sphere — glowing center */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[0.35, 1]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          wireframe
          depthWrite={false}
        />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Orbiting rings */}
      <mesh ref={(el) => { if (el) ringRefs.current[0] = el }}>
        <torusGeometry args={[0.7, 0.015, 8, 32]} />
        <meshBasicMaterial
          color="#00f0ff"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={(el) => { if (el) ringRefs.current[1] = el }} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[0.55, 0.012, 8, 32]} />
        <meshBasicMaterial
          color="#a855f7"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Orbiting data particles */}
      {particlePositions.map((p, i) => (
        <OrbitalParticle key={i} {...p} thinking={agentThinking} />
      ))}

      {/* Point light */}
      <pointLight color="#00f0ff" intensity={2} distance={8} />
    </group>
  )
}

function OrbitalParticle({
  phase,
  radius,
  speed,
  yOffset,
  thinking,
}: {
  phase: number
  radius: number
  speed: number
  yOffset: number
  thinking: boolean
}) {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const s = thinking ? speed * 2.5 : speed
    ref.current.position.x = Math.cos(t * s + phase) * radius
    ref.current.position.y = yOffset + Math.sin(t * s * 0.7 + phase) * 0.3
    ref.current.position.z = Math.sin(t * s + phase) * radius * 0.3
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.025, 6, 6]} />
      <meshBasicMaterial
        color="#00f0ff"
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}
