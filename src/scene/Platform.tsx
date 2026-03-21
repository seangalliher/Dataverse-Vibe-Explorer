import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { CDMDomain } from '@/utils/colors'
import { getDomainColors } from '@/utils/colors'
import { useAppStore } from '@/store/appStore'
import { Pillar } from './Pillar'

interface PlatformProps {
  id: string
  name: string
  domain: CDMDomain
  position: [number, number, number]
  recordCount: number
  columns: Array<{ name: string; dataType: string }>
}

/** Create a hexagonal shape */
function createHexShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = radius * Math.cos(angle)
    const y = radius * Math.sin(angle)
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

export function Platform({ id, name, domain, position, recordCount, columns }: PlatformProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  const { selectedTableId, setSelectedTable, setHoveredTable } = useAppStore()
  const isSelected = selectedTableId === id

  const colors = getDomainColors(domain)

  // Scale platform size logarithmically by record count
  const scale = 0.8 + Math.log10(Math.max(recordCount, 10)) * 0.3

  const hexShape = useMemo(() => createHexShape(2 * scale), [scale])
  const extrudeSettings = useMemo(
    () => ({
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3,
    }),
    [],
  )

  // Pulse glow on hover/select
  useFrame(({ clock }) => {
    if (!glowRef.current) return
    const t = clock.getElapsedTime()
    const baseIntensity = isSelected ? 0.8 : hovered ? 0.5 : 0.2
    const pulse = Math.sin(t * 2) * 0.1
    const mat = glowRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = baseIntensity + pulse
  })

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    setSelectedTable(isSelected ? null : id)
  }

  // Place pillars in a ring on top of the platform
  const pillarData = columns.slice(0, 8)

  return (
    <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.3}>
      <group position={position}>
        {/* Main hex platform */}
        <mesh
          ref={meshRef}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleClick}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
            setHoveredTable(id)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            setHoveredTable(null)
            document.body.style.cursor = 'default'
          }}
          castShadow
          receiveShadow
        >
          <extrudeGeometry args={[hexShape, extrudeSettings]} />
          <meshPhysicalMaterial
            color={colors.primary}
            transparent
            opacity={0.25}
            transmission={0.4}
            roughness={0.1}
            metalness={0.1}
            emissive={colors.three}
            emissiveIntensity={isSelected ? 0.4 : hovered ? 0.25 : 0.15}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Glow ring underneath */}
        <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, -0.15]} position={[0, -0.1, 0]}>
          <ringGeometry args={[2 * scale - 0.1, 2 * scale + 0.2, 6]} />
          <meshBasicMaterial
            color={colors.primary}
            transparent
            opacity={0.3}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Point light under platform */}
        <pointLight
          color={colors.primary}
          intensity={isSelected ? 3 : hovered ? 2 : 1}
          distance={15}
          position={[0, -1, 0]}
        />

        {/* Table name label */}
        <Text
          position={[0, 2.5 + pillarData.length * 0.1, 0]}
          fontSize={0.5}
          color={colors.accent}
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {name}
        </Text>

        {/* Record count badge */}
        <Text
          position={[0, 2.0 + pillarData.length * 0.1, 0]}
          fontSize={0.25}
          color="#94a3b8"
          anchorX="center"
          anchorY="bottom"
        >
          {recordCount.toLocaleString()} records
        </Text>

        {/* Column pillars */}
        {pillarData.map((col, i) => {
          const angle = (i / pillarData.length) * Math.PI * 2
          const r = 1.2 * scale
          const px = Math.cos(angle) * r
          const pz = Math.sin(angle) * r
          return (
            <Pillar
              key={col.name}
              name={col.name}
              dataType={col.dataType}
              position={[px, 0.3, pz]}
              domain={domain}
              index={i}
            />
          )
        })}

        {/* Selection ring */}
        {isSelected && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[2 * scale + 0.3, 2 * scale + 0.6, 6]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.6}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
    </Float>
  )
}
