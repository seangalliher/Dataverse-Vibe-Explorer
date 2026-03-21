import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { VibeCreationState } from '@/agent/vibeActions'

interface MaterializationEffectProps {
  state: VibeCreationState
}

/**
 * 3D materialization effect that shows an app being constructed:
 * Blueprint wireframe → Construction sparks → Solid portal
 */
export function MaterializationEffect({ state }: MaterializationEffectProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const wireframeRef = useRef<THREE.Mesh>(null!)
  const sparkRef = useRef<THREE.Points>(null!)

  // Spark particles
  const sparkCount = 60
  const sparkPositions = useMemo(() => {
    const arr = new Float32Array(sparkCount * 3)
    for (let i = 0; i < sparkCount; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 3
      arr[i * 3 + 1] = Math.random() * 4.5
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.5
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const t = clock.getElapsedTime()

    // Blueprint pulse
    if (wireframeRef.current) {
      const mat = wireframeRef.current.material as THREE.MeshBasicMaterial
      if (state.phase === 'blueprint') {
        mat.opacity = 0.15 + Math.sin(t * 3) * 0.1
        wireframeRef.current.scale.setScalar(0.8 + Math.sin(t * 2) * 0.05)
      } else if (state.phase === 'constructing') {
        const fill = state.progress / 100
        mat.opacity = 0.1 + fill * 0.4
      } else if (state.phase === 'materializing' || state.phase === 'complete') {
        mat.opacity = 0.6
      }
    }

    // Spark animation
    if (sparkRef.current && state.phase === 'constructing') {
      const positions = sparkRef.current.geometry.getAttribute('position')
      const arr = positions.array as Float32Array
      for (let i = 0; i < sparkCount; i++) {
        arr[i * 3] += (Math.random() - 0.5) * 0.05
        arr[i * 3 + 1] = ((arr[i * 3 + 1] + 0.05) % 4.5)
        arr[i * 3 + 2] += (Math.random() - 0.5) * 0.03
      }
      positions.needsUpdate = true
    }
  })

  if (state.phase === 'idle') return null

  const isBlueprint = state.phase === 'blueprint'
  const isConstructing = state.phase === 'constructing'
  const isMaterializing = state.phase === 'materializing'
  const isComplete = state.phase === 'complete'

  return (
    <group ref={groupRef} position={state.targetPosition}>
      {/* Portal wireframe outline */}
      <mesh ref={wireframeRef} position={[0, 2.2, 0]}>
        <boxGeometry args={[2.5, 4.2, 0.15]} />
        <meshBasicMaterial
          color={isBlueprint ? '#3b82f6' : '#00f0ff'}
          wireframe={isBlueprint || isConstructing}
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Construction fill (grows from bottom) */}
      {isConstructing && (
        <mesh position={[0, (state.progress / 100) * 2.1, 0]}>
          <boxGeometry args={[2.3, (state.progress / 100) * 4.0, 0.1]} />
          <meshBasicMaterial
            color="#00f0ff"
            transparent
            opacity={0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Sparks during construction */}
      {isConstructing && (
        <points ref={sparkRef}>
          <bufferGeometry>
            <bufferAttribute args={[sparkPositions, 3]} attach="attributes-position" />
          </bufferGeometry>
          <pointsMaterial
            color="#f59e0b"
            size={0.06}
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}

      {/* Completion flash */}
      {isMaterializing && (
        <mesh position={[0, 2.2, 0]}>
          <sphereGeometry args={[3, 16, 16]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.15}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* App name during creation */}
      {!isComplete && (
        <Text
          position={[0, 5, 0]}
          fontSize={0.3}
          color={isBlueprint ? '#3b82f6' : '#00f0ff'}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.01}
          outlineColor="#000000"
          fillOpacity={0.7}
        >
          {state.phase === 'blueprint' ? 'BLUEPRINT' : state.phase === 'constructing' ? `BUILDING ${state.progress}%` : 'MATERIALIZING'}
        </Text>
      )}
    </group>
  )
}
