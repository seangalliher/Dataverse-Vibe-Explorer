import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { CDMDomain } from '@/utils/colors'
import { getDomainColors } from '@/utils/colors'

const DATA_TYPE_COLORS: Record<string, string> = {
  string: '#60a5fa',
  number: '#f59e0b',
  boolean: '#10b981',
  datetime: '#a855f7',
  lookup: '#ec4899',
  currency: '#f59e0b',
  memo: '#6366f1',
  default: '#94a3b8',
}

interface PillarProps {
  name: string
  dataType: string
  position: [number, number, number]
  domain: CDMDomain
  index: number
}

export function Pillar({ name, dataType, position, domain, index }: PillarProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const pillarColor = DATA_TYPE_COLORS[dataType.toLowerCase()] ?? DATA_TYPE_COLORS.default
  const domainColors = getDomainColors(domain)

  // Height varies by type and index to create visual interest
  const height = 0.8 + (index % 4) * 0.4 + Math.sin(index * 1.7) * 0.3

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    const mat = meshRef.current.material as THREE.MeshPhysicalMaterial
    mat.emissiveIntensity = 0.15 + Math.sin(t * 1.5 + index * 0.8) * 0.05
  })

  return (
    <group position={position}>
      <mesh ref={meshRef} position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, height, 6]} />
        <meshPhysicalMaterial
          color={pillarColor}
          transparent
          opacity={0.5}
          transmission={0.3}
          roughness={0.15}
          metalness={0.2}
          emissive={new THREE.Color(pillarColor)}
          emissiveIntensity={0.15}
        />
      </mesh>

      {/* Pillar cap glow */}
      <mesh position={[0, height + 0.05, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial
          color={pillarColor}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
